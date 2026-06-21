using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using Nimbus.AdminApi.Services;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance/sales-orders")]
public class SalesOrdersController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly ISalesOrderService _salesOrderService;

    public SalesOrdersController(NimbusDbContext context, ISalesOrderService salesOrderService)
    {
        _context = context;
        _salesOrderService = salesOrderService;
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
        try
        {
            var order = await _salesOrderService.CreateSalesOrderAsync(request, UserId);
            return CreatedAtAction(nameof(GetSalesOrders), new { id = order.Id }, order);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ApproveSalesOrder(long id)
    {
        try
        {
            await _salesOrderService.ApproveSalesOrderAsync(id, UserId);
            var order = await _context.SalesOrders.FindAsync(id);
            return Ok(new { message = "Sales order approved and pick list generated.", orderStatus = order?.Status });
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public class CreateSalesOrderRequest
    {
        public string OrderNumber { get; set; } = null!;
        public string CustomerName { get; set; } = null!;
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public long? DeliveryAddressId { get; set; }
        public NewAddressDto? NewDeliveryAddress { get; set; }
        public SalesOrderLineRequest[] Lines { get; set; } = null!;
    }

    public class NewAddressDto
    {
        public string AddressName { get; set; } = null!;
        public string AddressLine1 { get; set; } = null!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = null!;
        public string? State { get; set; }
        public string PostalCode { get; set; } = null!;
        public string CountryCode { get; set; } = null!;
    }

    public class SalesOrderLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
        public string UnitOfSale { get; set; } = null!;
    }
}
