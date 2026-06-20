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
[Route("api/warehouse/shipments")]
public class ShipmentsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public ShipmentsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Warehouse,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetShipments()
    {
        var shipments = await _context.Shipments
            .Include(s => s.SalesOrder)
            .Include(s => s.Lines)
            .ThenInclude(l => l.StockItem)
            .OrderByDescending(s => s.ShippedDate)
            .ToListAsync();
        return Ok(shipments);
    }

    [HttpPost]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateShipment([FromBody] CreateShipmentRequest request)
    {
        var order = await _context.SalesOrders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == request.SalesOrderId);

        if (order == null) return NotFound(new { message = "Sales Order not found." });
        
        var shipment = new Shipment
        {
            SalesOrderId = order.Id,
            ShipmentNumber = request.ShipmentNumber,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            ShippedDate = DateTime.UtcNow,
            Status = "Shipped"
        };

        foreach (var reqLine in request.Lines)
        {
            var line = new ShipmentLine
            {
                ShipmentId = shipment.Id,
                StockItemId = reqLine.StockItemId,
                QuantityShipped = reqLine.QuantityShipped
            };

            shipment.Lines.Add(line);

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
                var firstWH = await _context.Warehouses.FirstOrDefaultAsync();
                lineWarehouseId = firstWH?.Id ?? 0;
            }

            // Deduct from StockInventory
            var inventory = await _context.StockInventories
                .FirstOrDefaultAsync(i => i.StockItemId == reqLine.StockItemId && i.BinLocationId == reqLine.BinLocationId && i.WarehouseId == lineWarehouseId);
            
            if (inventory == null && reqLine.BinLocationId != null)
            {
                // Create a record if it didn't exist (though it should)
                inventory = new StockInventory
                {
                    StockItemId = reqLine.StockItemId,
                    BinLocationId = reqLine.BinLocationId,
                    WarehouseId = lineWarehouseId,
                    Quantity = 0.0m
                };
                _context.StockInventories.Add(inventory);
            }

            if (inventory != null)
            {
                var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
                var qtyInStockUnits = reqLine.QuantityShipped / (stockItem?.ConversionRatio ?? 1.0m);
                inventory.Quantity -= qtyInStockUnits;
            }
        }

        order.Status = SalesOrderStatus.Shipped;

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetShipments), new { id = shipment.Id }, shipment);
    }

    public class CreateShipmentRequest
    {
        public long SalesOrderId { get; set; }
        public string ShipmentNumber { get; set; } = null!;
        public string Carrier { get; set; } = null!;
        public string TrackingNumber { get; set; } = null!;
        public ShipmentLineRequest[] Lines { get; set; } = null!;
    }

    public class ShipmentLineRequest
    {
        public long StockItemId { get; set; }
        public decimal QuantityShipped { get; set; }
        public long? BinLocationId { get; set; }
    }
}
