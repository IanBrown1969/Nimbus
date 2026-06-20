using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.AdminApi.Attributes;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/warehouse")]
public class WarehouseController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public WarehouseController(NimbusDbContext context)
    {
        _context = context;
    }

    // 1. Stock Listing (Available to everyone with Warehouse, Sales, or Admin roles)
    [HttpGet("stock")]
    [Authorize(Roles = "Warehouse,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetStock()
    {
        // Check if PIM plugin is active
        var hasPim = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "PIM" && tp.IsActive);

        // Fetch stock items
        var stockItems = await _context.StockItems.ToListAsync();
        
        // Fetch inventory aggregations
        var inventoryCounts = await _context.StockInventories
            .GroupBy(i => i.StockItemId)
            .Select(g => new { StockItemId = g.Key, TotalQuantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.StockItemId, x => x.TotalQuantity);

        var warehouses = await _context.Warehouses.ToListAsync();
        var inventories = await _context.StockInventories.ToListAsync();

        var result = stockItems.Select(item =>
        {
            var qty = inventoryCounts.TryGetValue(item.Id, out var count) ? count : 0.0m;
            
            var itemInventories = inventories.Where(i => i.StockItemId == item.Id).ToList();
            var warehouseQuantities = warehouses.Select(wh => 
            {
                var whQty = itemInventories.Where(i => i.WarehouseId == wh.Id).Sum(i => i.Quantity);
                return new 
                {
                    WarehouseId = wh.Id,
                    WarehouseCode = wh.Code,
                    WarehouseName = wh.Name,
                    Quantity = whQty,
                    SellingQuantity = whQty * item.ConversionRatio
                };
            }).ToList();

            return new
            {
                item.Id,
                item.SKU,
                Name = item.NameJson,
                Description = item.DescriptionJson,
                item.StockUnitOfSale,
                item.SellUnitOfSale,
                item.ConversionRatio,
                item.BasePrice,
                item.EnableForWebsite,
                StockingQuantity = qty,
                SellingQuantity = qty * item.ConversionRatio,
                WarehouseQuantities = warehouseQuantities,
                // PIM properties (only returned if PIM is subscribed)
                RichDescription = hasPim ? item.RichDescriptionJson : null,
                MediaUrls = hasPim ? item.MediaUrlsJson : null,
                Specifications = hasPim ? item.SpecificationsJson : null
            };
        });

        return Ok(result);
    }

    // 1.5. Warehouse Listing
    [HttpGet("warehouses")]
    [Authorize(Roles = "Warehouse,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetWarehouses()
    {
        var warehouses = await _context.Warehouses.ToListAsync();
        return Ok(warehouses);
    }

    // 2. Add Stock Item (PIM checks are done internally to decide if specs can be updated)
    [HttpPost("stock")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateStockItem([FromBody] CreateStockItemRequest request)
    {
        var hasPim = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "PIM" && tp.IsActive);

        var stockItem = new StockItem
        {
            SKU = request.SKU,
            NameJson = request.NameJson,
            DescriptionJson = request.DescriptionJson,
            StockUnitOfSale = request.StockUnitOfSale,
            SellUnitOfSale = request.SellUnitOfSale,
            ConversionRatio = request.ConversionRatio,
            BasePrice = request.BasePrice,
            EnableForWebsite = request.EnableForWebsite
        };

        if (hasPim)
        {
            stockItem.RichDescriptionJson = request.RichDescriptionJson ?? "{}";
            stockItem.MediaUrlsJson = request.MediaUrlsJson ?? "[]";
            stockItem.SpecificationsJson = request.SpecificationsJson ?? "{}";
        }

        _context.StockItems.Add(stockItem);
        await _context.SaveChangesAsync();

        // Initialize empty inventory for it in all warehouses
        var warehouses = await _context.Warehouses.ToListAsync();
        if (warehouses.Any())
        {
            foreach (var wh in warehouses)
            {
                _context.StockInventories.Add(new StockInventory
                {
                    StockItemId = stockItem.Id,
                    WarehouseId = wh.Id,
                    Quantity = 0.0m
                });
            }
        }
        else
        {
            _context.StockInventories.Add(new StockInventory
            {
                StockItemId = stockItem.Id,
                Quantity = 0.0m
            });
        }
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetStock), new { id = stockItem.Id }, stockItem);
    }

    // 3. Bin Locations (Requires WMS Plugin)
    [HttpGet("bins")]
    [RequirePlugin("WMS")]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetBins()
    {
        var bins = await _context.BinLocations.ToListAsync();
        return Ok(bins);
    }

    [HttpPost("bins")]
    [RequirePlugin("WMS")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateBin([FromBody] CreateBinRequest request)
    {
        var bin = new BinLocation
        {
            Code = request.Code,
            Description = request.Description
        };
        _context.BinLocations.Add(bin);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetBins), new { id = bin.Id }, bin);
    }

    // 4. Create Stock Check Sheet (Requires WMS Plugin)
    [HttpPost("stockcheck")]
    [RequirePlugin("WMS")]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateStockCheck([FromBody] CreateStockCheckRequest request)
    {
        var stockCheck = new StockCheck
        {
            CheckDate = DateTime.UtcNow,
            CreatedByUserId = UserId,
            Notes = request.Notes,
            IsCompleted = false
        };

        _context.StockChecks.Add(stockCheck);
        await _context.SaveChangesAsync();

        // Automatically populate stock check lines with current expected stock levels in active bins
        var currentInventory = await _context.StockInventories
            .Where(si => si.BinLocationId != null)
            .ToListAsync();

        foreach (var inv in currentInventory)
        {
            var line = new StockCheckLine
            {
                StockCheckId = stockCheck.Id,
                StockItemId = inv.StockItemId,
                BinLocationId = inv.BinLocationId,
                ExpectedQuantity = inv.Quantity,
                CountedQuantity = 0.0m // default to 0 to be audited
            };
            _context.StockCheckLines.Add(line);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "stock check sheet created successfully.",
            stockCheckId = stockCheck.Id,
            linesCount = currentInventory.Count
        });
    }

    [HttpPost("stock/{id}")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdateStockItem(long id, [FromBody] UpdateStockItemRequest request)
    {
        var hasPim = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "PIM" && tp.IsActive);

        var item = await _context.StockItems.FindAsync(id);
        if (item == null)
        {
            return NotFound();
        }

        item.SKU = request.SKU;
        item.NameJson = request.NameJson;
        item.DescriptionJson = request.DescriptionJson;
        item.StockUnitOfSale = request.StockUnitOfSale;
        item.SellUnitOfSale = request.SellUnitOfSale;
        item.ConversionRatio = request.ConversionRatio;
        item.BasePrice = request.BasePrice;
        item.EnableForWebsite = request.EnableForWebsite;

        if (hasPim)
        {
            item.RichDescriptionJson = request.RichDescriptionJson ?? "{}";
            item.MediaUrlsJson = request.MediaUrlsJson ?? "[]";
            item.SpecificationsJson = request.SpecificationsJson ?? "{}";
        }

        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPost("warehouses")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest request)
    {
        var wh = new Warehouse
        {
            Code = request.Code,
            Name = request.Name,
            Address = request.Address
        };
        _context.Warehouses.Add(wh);
        await _context.SaveChangesAsync();

        // Auto-populate existing stock items with 0 stock in this new warehouse
        var stockItems = await _context.StockItems.ToListAsync();
        foreach (var item in stockItems)
        {
            _context.StockInventories.Add(new StockInventory
            {
                StockItemId = item.Id,
                WarehouseId = wh.Id,
                Quantity = 0.0m
            });
        }
        await _context.SaveChangesAsync();

        return Ok(wh);
    }

    [HttpPost("warehouses/{id}")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdateWarehouse(long id, [FromBody] CreateWarehouseRequest request)
    {
        var wh = await _context.Warehouses.FindAsync(id);
        if (wh == null)
        {
            return NotFound();
        }
        wh.Code = request.Code;
        wh.Name = request.Name;
        wh.Address = request.Address;

        await _context.SaveChangesAsync();
        return Ok(wh);
    }

    public class CreateStockItemRequest
    {
        public string SKU { get; set; } = null!;
        public string NameJson { get; set; } = "{}";
        public string DescriptionJson { get; set; } = "{}";
        public string StockUnitOfSale { get; set; } = null!;
        public string SellUnitOfSale { get; set; } = null!;
        public decimal ConversionRatio { get; set; } = 1.0m;
        public decimal BasePrice { get; set; }
        public bool EnableForWebsite { get; set; }
        public string? RichDescriptionJson { get; set; }
        public string? MediaUrlsJson { get; set; }
        public string? SpecificationsJson { get; set; }
    }

    public class CreateBinRequest
    {
        public string Code { get; set; } = null!;
        public string Description { get; set; } = null!;
    }

    public class CreateStockCheckRequest
    {
        public string? Notes { get; set; }
    }

    public class UpdateStockItemRequest
    {
        public string SKU { get; set; } = null!;
        public string NameJson { get; set; } = "{}";
        public string DescriptionJson { get; set; } = "{}";
        public string StockUnitOfSale { get; set; } = null!;
        public string SellUnitOfSale { get; set; } = null!;
        public decimal ConversionRatio { get; set; } = 1.0m;
        public decimal BasePrice { get; set; }
        public bool EnableForWebsite { get; set; }
        public string? RichDescriptionJson { get; set; }
        public string? MediaUrlsJson { get; set; }
        public string? SpecificationsJson { get; set; }
    }

    public class CreateWarehouseRequest
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Address { get; set; }
    }
}
