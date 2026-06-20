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
[Route("api/warehouse/deliveries")]
public class DeliveriesController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public DeliveriesController(NimbusDbContext context)
    {
        _context = context;
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
        var po = await _context.PurchaseOrders
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseOrderId);

        if (po == null) return NotFound(new { message = "Purchase Order not found." });

        var delivery = new Delivery
        {
            PurchaseOrderId = po.Id,
            DeliveryNumber = request.DeliveryNumber,
            DeliveryDate = DateTime.UtcNow,
            ReceivedByUserId = UserId
        };

        var firstWarehouse = await _context.Warehouses.FirstOrDefaultAsync();
        var defaultWarehouseId = firstWarehouse?.Id ?? 0;

        foreach (var reqLine in request.Lines)
        {
            long lineWarehouseId = 0;
            if (reqLine.BinLocationId.HasValue)
            {
                var bin = await _context.BinLocations.FindAsync(reqLine.BinLocationId.Value);
                if (bin != null)
                {
                    lineWarehouseId = bin.WarehouseId;
                }
            }
            if (lineWarehouseId == 0)
            {
                lineWarehouseId = defaultWarehouseId;
            }

            var line = new DeliveryLine
            {
                DeliveryId = delivery.Id,
                StockItemId = reqLine.StockItemId,
                QuantityDelivered = reqLine.QuantityDelivered,
                BinLocationId = reqLine.BinLocationId,
                WarehouseId = lineWarehouseId
            };

            delivery.Lines.Add(line);

            // Update PurchaseOrderLine.ReceivedQuantity
            var poLine = po.Lines.FirstOrDefault(l => l.StockItemId == reqLine.StockItemId);
            if (poLine != null)
            {
                poLine.ReceivedQuantity += (int)reqLine.QuantityDelivered;
            }

            // Update StockInventory
            var inventory = await _context.StockInventories
                .FirstOrDefaultAsync(i => i.StockItemId == reqLine.StockItemId && i.BinLocationId == reqLine.BinLocationId && i.WarehouseId == lineWarehouseId);

            if (inventory == null)
            {
                inventory = new StockInventory
                {
                    StockItemId = reqLine.StockItemId,
                    BinLocationId = reqLine.BinLocationId,
                    WarehouseId = lineWarehouseId,
                    Quantity = 0.0m
                };
                _context.StockInventories.Add(inventory);
            }

            var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
            var qtyInStockUnits = reqLine.QuantityDelivered / (stockItem?.ConversionRatio ?? 1.0m);
            inventory.Quantity += qtyInStockUnits;
        }

        // Check if all lines are fully received
        bool allReceived = po.Lines.All(l => l.ReceivedQuantity >= l.Quantity);
        if (allReceived)
        {
            po.Status = PurchaseOrderStatus.Received;
        }
        else
        {
            po.Status = PurchaseOrderStatus.Ordered; // partially received
        }

        _context.Deliveries.Add(delivery);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDeliveries), new { id = delivery.Id }, delivery);
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
    }
}
