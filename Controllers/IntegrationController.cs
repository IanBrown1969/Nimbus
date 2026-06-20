using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;

namespace Nimbus.AdminApi.Controllers;

[ApiController]
[Route("api/integration")]
public class IntegrationController : ControllerBase
{
    private readonly NimbusDbContext _context;

    public IntegrationController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetWebCatalog()
    {
        // 1. Simple API Key Authentication Check
        if (!Request.Headers.TryGetValue("X-Api-Key", out var apiKeyHeader) || 
            apiKeyHeader.ToString() != "Nimbus_Web_Integration_Key_2026")
        {
            return Unauthorized(new { message = "Invalid or missing integration API Key." });
        }

        // 2. Fetch web-enabled items (Tenant global filter applies if X-Tenant-ID header is provided)
        var webItems = await _context.StockItems
            .Where(s => s.EnableForWebsite)
            .ToListAsync();

        // Fetch inventory aggregations
        var inventoryCounts = await _context.StockInventories
            .GroupBy(i => i.StockItemId)
            .Select(g => new { StockItemId = g.Key, TotalQuantity = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.StockItemId, x => x.TotalQuantity);

        var result = webItems.Select(item =>
        {
            var stockingQty = inventoryCounts.TryGetValue(item.Id, out var count) ? count : 0.0m;
            
            // Render translation dictionary directly or let website choose locale
            return new
            {
                item.Id,
                item.SKU,
                Names = item.NameJson,
                Descriptions = item.DescriptionJson,
                SellingUnit = item.SellUnitOfSale,
                Price = item.BasePrice,
                // Automatically show relationship stocking quantity converted to selling quantity
                AvailableQuantity = stockingQty * item.ConversionRatio,
                // Include rich properties if set
                RichDetails = item.RichDescriptionJson,
                Images = item.MediaUrlsJson,
                Specs = item.SpecificationsJson
            };
        });

        return Ok(result);
    }
}
