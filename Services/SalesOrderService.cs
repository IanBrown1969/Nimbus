using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using static Nimbus.AdminApi.Controllers.SalesOrdersController;

namespace Nimbus.AdminApi.Services;

public class SalesOrderService : ISalesOrderService
{
    private readonly NimbusDbContext _context;

    public SalesOrderService(NimbusDbContext context)
    {
        _context = context;
    }

    public async Task<SalesOrder> CreateSalesOrderAsync(CreateSalesOrderRequest request, long creatorUserId)
    {
        var exchangeRate = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase;

        var order = new SalesOrder
        {
            OrderNumber = request.OrderNumber,
            CustomerName = request.CustomerName,
            OrderDate = DateTime.UtcNow,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = exchangeRate,
            Status = SalesOrderStatus.Draft,
            CreatedByUserId = creatorUserId
        };

        if (request.NewDeliveryAddress != null)
        {
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
            if (customer == null)
            {
                throw new ArgumentException($"Customer {request.CustomerName} not found.");
            }

            var country = await _context.Countries
                .FirstOrDefaultAsync(c => c.Code == request.NewDeliveryAddress.CountryCode);
            if (country == null)
            {
                throw new ArgumentException($"Country code {request.NewDeliveryAddress.CountryCode} not found.");
            }

            var newAddress = new CustomerAddress
            {
                CustomerId = customer.Id,
                AddressName = request.NewDeliveryAddress.AddressName,
                AddressLine1 = request.NewDeliveryAddress.AddressLine1,
                AddressLine2 = request.NewDeliveryAddress.AddressLine2,
                City = request.NewDeliveryAddress.City,
                State = request.NewDeliveryAddress.State,
                PostalCode = request.NewDeliveryAddress.PostalCode,
                CountryId = country.Id,
                AddressType = "Shipping",
                IsDefault = false
            };
            _context.CustomerAddresses.Add(newAddress);
            await _context.SaveChangesAsync();
            order.DeliveryAddressId = newAddress.Id;
        }
        else if (request.DeliveryAddressId.HasValue)
        {
            order.DeliveryAddressId = request.DeliveryAddressId.Value;
        }

        decimal totalNet = 0.0m;
        decimal totalTax = 0.0m;

        var isVatPluginActive = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "VAT" && tp.IsActive);

        // Group requested lines by StockItemId to check total requested quantity per item
        var requestedQuantities = request.Lines
            .GroupBy(l => l.StockItemId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        foreach (var reqLine in request.Lines)
        {
            var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
            if (stockItem == null)
            {
                throw new ArgumentException($"StockItem {reqLine.StockItemId} not found.");
            }

            // Check free stock constraint if backorders are not allowed
            if (!stockItem.AllowBackorder)
            {
                // Calculate current physical stock in selling units
                var totalPhysicalStock = await _context.StockInventories
                    .Where(i => i.StockItemId == reqLine.StockItemId)
                    .SumAsync(i => i.Quantity) * stockItem.ConversionRatio;

                // Calculate current demand in selling units: Ordered - Shipped (excluding the one we are creating)
                var totalOrdered = await _context.SalesOrders
                    .Where(o => o.Status != SalesOrderStatus.Cancelled)
                    .SelectMany(o => o.Lines)
                    .Where(l => l.StockItemId == reqLine.StockItemId)
                    .SumAsync(l => l.Quantity);

                var totalShipped = await _context.Shipments
                    .Include(s => s.SalesOrder)
                    .Where(s => s.SalesOrder.Status != SalesOrderStatus.Cancelled)
                    .SelectMany(s => s.Lines)
                    .Where(l => l.StockItemId == reqLine.StockItemId)
                    .SumAsync(l => l.QuantityShipped);

                var currentDemand = Math.Max(0.0m, totalOrdered - totalShipped);

                var freeStock = totalPhysicalStock - currentDemand;
                var totalRequested = requestedQuantities[reqLine.StockItemId];
                
                if (freeStock - totalRequested < 0)
                {
                    throw new ArgumentException($"Cannot place order for SKU {stockItem.SKU}. Free stock is {freeStock:0.##} units, but {totalRequested:0.##} units were requested, and backordering is disabled for this product.");
                }
            }

            decimal resolvedTaxRate = await ResolveTaxRateForAddressAsync(request.CustomerName, stockItem, order.DeliveryAddressId, null, reqLine.TaxRate);

            var line = new SalesOrderLine
            {
                SalesOrderId = order.Id,
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                TaxRate = resolvedTaxRate,
                UnitOfSale = !string.IsNullOrWhiteSpace(reqLine.UnitOfSale) ? reqLine.UnitOfSale : (stockItem.SellUnitOfSale ?? "Each")
            };

            totalNet += line.NetAmount;
            totalTax += line.TaxAmount;

            order.Lines.Add(line);
        }

        order.TotalNet = totalNet;
        order.TotalTax = totalTax;

        _context.SalesOrders.Add(order);
        await _context.SaveChangesAsync();

        return order;
    }

    public async Task ApproveSalesOrderAsync(long id, long approverUserId)
    {
        var order = await _context.SalesOrders
            .Include(o => o.Lines)
            .ThenInclude(l => l.StockItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
        {
            throw new ArgumentException("Sales order not found.");
        }

        if (order.Status != SalesOrderStatus.Draft)
        {
            throw new InvalidOperationException("Sales order is not in Draft status.");
        }

        // Segregation of Duties Check
        // if (order.CreatedByUserId == approverUserId)
        // {
        //     throw new InvalidOperationException("Segregation of duties violation: You cannot approve a sales order that you created.");
        // }

        order.Status = SalesOrderStatus.Approved;

        var firstWarehouse = await _context.Warehouses.FirstOrDefaultAsync();
        var defaultWarehouseId = firstWarehouse?.Id ?? 0;

        // Generate pick list
        var pickList = new PickList
        {
            SalesOrderId = order.Id,
            PickListNumber = $"PK-{order.OrderNumber.Replace("SO-", "")}",
            CreatedDate = DateTime.UtcNow,
            IsCompleted = false
        };

        foreach (var line in order.Lines)
        {
            var inventory = await _context.StockInventories
                .Include(i => i.BinLocation)
                .Where(i => i.StockItemId == line.StockItemId && i.Quantity > 0)
                .FirstOrDefaultAsync();

            var lineWarehouseId = inventory?.WarehouseId ?? defaultWarehouseId;

            pickList.Lines.Add(new PickListLine
            {
                StockItemId = line.StockItemId,
                BinLocationId = inventory?.BinLocationId,
                WarehouseId = lineWarehouseId,
                QuantityToPick = line.Quantity,
                QuantityPicked = 0
            });
        }

        _context.PickLists.Add(pickList);
        await _context.SaveChangesAsync();
    }

    private async Task<decimal> ResolveTaxRateAsync(string customerName, StockItem stockItem, decimal requestedTaxRate)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Name == customerName || c.CompanyName == customerName);

        long? deliveryAddressId = null;
        if (customer != null)
        {
            var shippingAddress = await _context.CustomerAddresses
                .FirstOrDefaultAsync(a => a.CustomerId == customer.Id && a.AddressType == "Shipping" && a.IsDefault);
            if (shippingAddress == null)
            {
                shippingAddress = await _context.CustomerAddresses
                    .FirstOrDefaultAsync(a => a.CustomerId == customer.Id && a.AddressType == "Shipping");
            }
            deliveryAddressId = shippingAddress?.Id;
        }

        return await ResolveTaxRateForAddressAsync(customerName, stockItem, deliveryAddressId, null, requestedTaxRate);
    }

    public async Task<decimal> ResolveTaxRateForAddressAsync(string customerName, StockItem stockItem, long? deliveryAddressId, string? deliveryCountryCode = null, decimal requestedTaxRate = 0.0m)
    {
        var isVatPluginActive = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "VAT" && tp.IsActive);
        if (!isVatPluginActive || !stockItem.TaxClassId.HasValue)
        {
            return requestedTaxRate;
        }

        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Name == customerName || c.CompanyName == customerName);

        long? baseCountryId = null;
        long? deliveryCountryId = null;
        CustomerAddress? shippingAddress = null;

        if (deliveryAddressId.HasValue || !string.IsNullOrEmpty(deliveryCountryCode))
        {
            if (deliveryAddressId.HasValue)
            {
                shippingAddress = await _context.CustomerAddresses
                    .Include(a => a.Country)
                    .FirstOrDefaultAsync(a => a.Id == deliveryAddressId.Value);

                if (shippingAddress != null)
                {
                    deliveryCountryId = shippingAddress.CountryId;
                }
            }
            else
            {
                var country = await _context.Countries.FirstOrDefaultAsync(c => c.Code == deliveryCountryCode);
                deliveryCountryId = country?.Id;
            }

            var baseCountries = await _context.Countries.Where(c => c.IsBaseCountry && c.IsActive).ToListAsync();
            var baseCountry = baseCountries.FirstOrDefault() 
                              ?? await _context.Countries.FirstOrDefaultAsync(c => c.Code == "GB");
            baseCountryId = baseCountry?.Id;
        }
        else
        {
            // No delivery address chosen - fall back to billing address
            if (customer != null)
            {
                var billingAddress = await _context.CustomerAddresses
                    .FirstOrDefaultAsync(a => a.CustomerId == customer.Id && a.AddressType == "Billing" && a.IsDefault);
                if (billingAddress == null)
                {
                    billingAddress = await _context.CustomerAddresses
                        .FirstOrDefaultAsync(a => a.CustomerId == customer.Id && a.AddressType == "Billing");
                }
                deliveryCountryId = billingAddress?.CountryId ?? customer.CountryId;
            }
            else
            {
                var contact = await _context.Contacts
                    .FirstOrDefaultAsync(c => c.Name == customerName || c.CompanyName == customerName);
                if (contact != null)
                {
                    deliveryCountryId = contact.CountryId;
                }
            }

            baseCountryId = deliveryCountryId;
        }

        if (!baseCountryId.HasValue || !deliveryCountryId.HasValue)
        {
            return requestedTaxRate;
        }

        var baseCountryEntity = await _context.Countries.FindAsync(baseCountryId.Value);
        var deliveryCountryEntity = await _context.Countries.FindAsync(deliveryCountryId.Value);

        if (baseCountryEntity == null || deliveryCountryEntity == null)
        {
            return requestedTaxRate;
        }

        // Determine delivery country zone fallback to Rest of the World
        long? deliveryZoneId = null;
        if (deliveryCountryEntity.TaxZoneId.HasValue)
        {
            var zone = await _context.TaxZones.FindAsync(deliveryCountryEntity.TaxZoneId.Value);
            if (zone != null && (zone.Name == "EU Tax Zone" || zone.Name == "UK Tax Zone"))
            {
                deliveryZoneId = deliveryCountryEntity.TaxZoneId.Value;
            }
        }

        if (deliveryZoneId == null)
        {
            var rotwZone = await _context.TaxZones
                .FirstOrDefaultAsync(z => z.Name == "Rest of the World" || z.Name.Contains("Rest of the World"));
            if (rotwZone != null)
            {
                deliveryZoneId = rotwZone.Id;
            }
        }

        // Rule 1: Domestic Sale (Base Country == Delivery Country)
        if (baseCountryEntity.Id == deliveryCountryEntity.Id)
        {
            var rateRule = await _context.TaxRates
                .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                          r.DeliveryCountryId == deliveryCountryEntity.Id && 
                                          r.TaxClassId == stockItem.TaxClassId.Value);

            if (rateRule == null && deliveryZoneId.HasValue)
            {
                rateRule = await _context.TaxRates
                    .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                              r.DeliveryZoneId == deliveryZoneId.Value && 
                                              r.TaxClassId == stockItem.TaxClassId.Value);
            }

            return rateRule?.Rate ?? requestedTaxRate;
        }

        // Rule 2: Cross-Border Sale (Base Country != Delivery Country)
        if (shippingAddress != null && !string.IsNullOrWhiteSpace(shippingAddress.TaxCode))
        {
            return 0.0m;
        }

        var crossBorderRule = await _context.TaxRates
            .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                      r.DeliveryCountryId == deliveryCountryEntity.Id && 
                                      r.TaxClassId == stockItem.TaxClassId.Value);

        if (crossBorderRule != null)
        {
            return crossBorderRule.Rate;
        }

        if (deliveryZoneId.HasValue)
        {
            var zoneRule = await _context.TaxRates
                .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                          r.DeliveryZoneId == deliveryZoneId.Value && 
                                          r.TaxClassId == stockItem.TaxClassId.Value);
            if (zoneRule != null)
            {
                return zoneRule.Rate;
            }
        }

        // Fallback to base country domestic tax
        var fallbackRule = await _context.TaxRates
            .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                      r.DeliveryCountryId == baseCountryEntity.Id && 
                                      r.TaxClassId == stockItem.TaxClassId.Value);

        if (fallbackRule == null)
        {
            long? baseZoneId = null;
            if (baseCountryEntity.TaxZoneId.HasValue)
            {
                var zone = await _context.TaxZones.FindAsync(baseCountryEntity.TaxZoneId.Value);
                if (zone != null && (zone.Name == "EU Tax Zone" || zone.Name == "UK Tax Zone"))
                {
                    baseZoneId = baseCountryEntity.TaxZoneId.Value;
                }
            }
            if (baseZoneId == null)
            {
                var rotwZone = await _context.TaxZones
                    .FirstOrDefaultAsync(z => z.Name == "Rest of the World" || z.Name.Contains("Rest of the World"));
                if (rotwZone != null)
                {
                    baseZoneId = rotwZone.Id;
                }
            }

            if (baseZoneId.HasValue)
            {
                fallbackRule = await _context.TaxRates
                    .FirstOrDefaultAsync(r => r.BaseCountryId == baseCountryEntity.Id && 
                                              r.DeliveryZoneId == baseZoneId.Value && 
                                              r.TaxClassId == stockItem.TaxClassId.Value);
            }
        }

        return fallbackRule?.Rate ?? requestedTaxRate;
    }
}
