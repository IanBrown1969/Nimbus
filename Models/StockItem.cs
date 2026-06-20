using System;

namespace Nimbus.DatabaseStructures.Models;

public class StockItem
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string SKU { get; set; } = null!;
    
    // JSON dictionaries for multi-language translations (e.g. {"en-GB":"Brick","fr-FR":"Brique"})
    public string NameJson { get; set; } = "{}";
    public string DescriptionJson { get; set; } = "{}";

    // Stocking vs Selling units conversion
    public string StockUnitOfSale { get; set; } = null!; // e.g. "Pallet"
    public string SellUnitOfSale { get; set; } = null!;  // e.g. "Each"
    
    // stocking quantity multiplied by conversion ratio equals selling quantity (e.g. 1 Pallet * 24 Each = 24 Each)
    public decimal ConversionRatio { get; set; } = 1.0m;

    public decimal BasePrice { get; set; } // price in base currency
    public bool EnableForWebsite { get; set; } = false;
    public bool AllowBackorder { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Advanced PIM characteristics (Restricted by PIM subscription API filters)
    public string RichDescriptionJson { get; set; } = "{}"; // Localized rich HTML descriptions
    public string MediaUrlsJson { get; set; } = "[]"; // JSON array of image/video URLs
    public string SpecificationsJson { get; set; } = "{}"; // JSON list of product specifications (e.g. dimensions, weight)

    public long? TaxClassId { get; set; }
    public TaxClass? TaxClass { get; set; }
}
