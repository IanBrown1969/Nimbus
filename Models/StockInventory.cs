using System;

namespace Nimbus.DatabaseStructures.Models;

public class StockInventory
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public long WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public long? BinLocationId { get; set; } // Nullable if WMS is not active, representing unallocated central inventory
    public BinLocation? BinLocation { get; set; }

    // Tracked in the item's StockUnitOfSale (e.g. 5 pallets)
    public decimal Quantity { get; set; }

    // Calculated helper properties
    public decimal SellingQuantity => Quantity * (StockItem?.ConversionRatio ?? 1.0m);
}
