using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance/sales-orders")]
public class SalesOrdersController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public SalesOrdersController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetSalesOrders()
    {
        var orders = await _context.SalesOrders
            .Include(s => s.Lines)
            .ThenInclude(l => l.StockItem)
            .OrderByDescending(s => s.OrderDate)
            .ToListAsync();
        return Ok(orders);
    }

    [HttpPost]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateSalesOrder([FromBody] CreateSalesOrderRequest request)
    {
        var exchangeRate = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase;

        var order = new SalesOrder
        {
            OrderNumber = request.OrderNumber,
            CustomerName = request.CustomerName,
            OrderDate = DateTime.UtcNow,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = exchangeRate,
            Status = SalesOrderStatus.Draft
        };

        decimal totalNet = 0.0m;
        decimal totalTax = 0.0m;

        // Check if VAT plugin is active
        var isVatPluginActive = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "VAT" && tp.IsActive);

        foreach (var reqLine in request.Lines)
        {
            var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
            if (stockItem == null)
            {
                return BadRequest(new { message = $"StockItem {reqLine.StockItemId} not found." });
            }

            decimal resolvedTaxRate = reqLine.TaxRate;
            if (isVatPluginActive)
            {
                var contact = await _context.Contacts.Include(c => c.Country).FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
                if (contact != null && contact.CountryId.HasValue && stockItem.TaxClassId.HasValue)
                {
                    var taxRateRule = await _context.TaxRates
                        .FirstOrDefaultAsync(r => r.CountryId == contact.CountryId.Value && r.TaxClassId == stockItem.TaxClassId.Value);
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

        return CreatedAtAction(nameof(GetSalesOrders), new { id = order.Id }, order);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ApproveSalesOrder(long id)
    {
        var order = await _context.SalesOrders
            .Include(o => o.Lines)
            .ThenInclude(l => l.StockItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound();
        if (order.Status != SalesOrderStatus.Draft)
        {
            return BadRequest(new { message = "Sales order is not in Draft status." });
        }

        order.Status = SalesOrderStatus.Approved;

        var firstWarehouse = await _context.Warehouses.FirstOrDefaultAsync();
        var defaultWarehouseId = firstWarehouse?.Id ?? 0;

        // Automatically generate a Warehouse Pick List for this sales order!
        var pickList = new PickList
        {
            SalesOrderId = order.Id,
            PickListNumber = $"PK-{order.OrderNumber.Replace("SO-", "")}",
            CreatedDate = DateTime.UtcNow,
            IsCompleted = false
        };

        // Determine bin locations to pick from based on inventory levels
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

        return Ok(new { message = "Sales order approved and pick list generated.", orderStatus = order.Status });
    }

    public class CreateSalesOrderRequest
    {
        public string OrderNumber { get; set; } = null!;
        public string CustomerName { get; set; } = null!;
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public SalesOrderLineRequest[] Lines { get; set; } = null!;
    }

    public class SalesOrderLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
    }
}
