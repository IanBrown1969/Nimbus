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
[Route("api/warehouse/deliveries")]
public class DeliveriesController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly IDeliveryService _deliveryService;

    public DeliveriesController(NimbusDbContext context, IDeliveryService deliveryService)
    {
        _context = context;
        _deliveryService = deliveryService;
    }

    [HttpGet]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetDeliveries()
    {
        var deliveries = await _context.Deliveries
            .Include(d => d.PurchaseOrder)
            .Include(d => d.ReceivedByUser)
            .Include(d => d.Lines)
            .ThenInclude(l => l.StockItem)
            .Include(d => d.Lines)
            .ThenInclude(l => l.BinLocation)
            .OrderByDescending(d => d.DeliveryDate)
            .ToListAsync();
        return Ok(deliveries);
    }

    [HttpPost]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateDelivery([FromBody] CreateDeliveryRequest request)
    {
        try
        {
            var delivery = await _deliveryService.CreateDeliveryAsync(request, UserId);
            return CreatedAtAction(nameof(GetDeliveries), new { id = delivery.Id }, delivery);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public class CreateDeliveryRequest
    {
        public long PurchaseOrderId { get; set; }
        public string DeliveryNumber { get; set; } = null!;
        public DeliveryLineRequest[] Lines { get; set; } = null!;
    }

    public class DeliveryLineRequest
    {
        public long StockItemId { get; set; }
        public decimal QuantityDelivered { get; set; }
        public long? BinLocationId { get; set; }
        public long? WarehouseId { get; set; }
    }
}
