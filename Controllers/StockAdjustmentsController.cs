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
[Route("api/warehouse/adjustments")]
public class StockAdjustmentsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public StockAdjustmentsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetAdjustments()
    {
        var adjustments = await _context.StockAdjustments
            .Include(a => a.StockItem)
            .Include(a => a.BinLocation)
            .Include(a => a.User)
            .OrderByDescending(a => a.Date)
            .ToListAsync();
        return Ok(adjustments);
    }

    [HttpPost]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateAdjustment([FromBody] CreateAdjustmentRequest request)
    {
        var stockItem = await _context.StockItems.FindAsync(request.StockItemId);
        if (stockItem == null) return NotFound(new { message = "Stock Item not found." });

        long resolvedWarehouseId = request.WarehouseId;
        if (resolvedWarehouseId == 0)
        {
            if (request.BinLocationId.HasValue)
            {
                var bin = await _context.BinLocations.FindAsync(request.BinLocationId.Value);
                if (bin != null)
                {
                    resolvedWarehouseId = bin.WarehouseId;
                }
            }
        }
        if (resolvedWarehouseId == 0)
        {
            var firstWH = await _context.Warehouses.FirstOrDefaultAsync();
            resolvedWarehouseId = firstWH?.Id ?? 0;
        }

        var adjustment = new StockAdjustment
        {
            StockItemId = request.StockItemId,
            BinLocationId = request.BinLocationId,
            WarehouseId = resolvedWarehouseId,
            QuantityChanged = request.QuantityChanged,
            Reason = request.Reason,
            Date = DateTime.UtcNow,
            UserId = UserId
        };

        // Update StockInventory
        var inventory = await _context.StockInventories
            .FirstOrDefaultAsync(i => i.StockItemId == request.StockItemId && i.BinLocationId == request.BinLocationId && i.WarehouseId == resolvedWarehouseId);

        if (inventory == null)
        {
            inventory = new StockInventory
            {
                StockItemId = request.StockItemId,
                BinLocationId = request.BinLocationId,
                WarehouseId = resolvedWarehouseId,
                Quantity = 0.0m
            };
            _context.StockInventories.Add(inventory);
        }

        // Quantities in StockInventory are in Stocking units of sale
        var qtyInStockUnits = request.QuantityChanged / stockItem.ConversionRatio;
        inventory.Quantity += qtyInStockUnits;

        _context.StockAdjustments.Add(adjustment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAdjustments), new { id = adjustment.Id }, adjustment);
    }

    public class CreateAdjustmentRequest
    {
        public long StockItemId { get; set; }
        public long? BinLocationId { get; set; }
        public long WarehouseId { get; set; }
        public decimal QuantityChanged { get; set; }
        public string Reason { get; set; } = null!;
    }
}
