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

            decimal resolvedTaxRate = reqLine.TaxRate;
            if (isVatPluginActive)
            {
                long? countryId = null;
                var customer = await _context.Customers
                    .Include(c => c.Country)
                    .FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
                
                if (customer != null && customer.CountryId.HasValue)
                {
                    countryId = customer.CountryId.Value;
                }
                else
                {
                    var contact = await _context.Contacts
                        .Include(c => c.Country)
                        .FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
                    
                    if (contact != null && contact.CountryId.HasValue)
                    {
                        countryId = contact.CountryId.Value;
                    }
                }

                if (countryId.HasValue && stockItem.TaxClassId.HasValue)
                {
                    var taxRateRule = await _context.TaxRates
                        .FirstOrDefaultAsync(r => r.CountryId == countryId.Value && r.TaxClassId == stockItem.TaxClassId.Value);
                    if (taxRateRule != null)
                    {
                        resolvedTaxRate = taxRateRule.Rate;
                    }
                }
            }

            var line = new SalesOrderLine
            {
                SalesOrderId = order.Id,
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                TaxRate = resolvedTaxRate
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
        if (order.CreatedByUserId == approverUserId)
        {
            throw new InvalidOperationException("Segregation of duties violation: You cannot approve a sales order that you created.");
        }

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
}
