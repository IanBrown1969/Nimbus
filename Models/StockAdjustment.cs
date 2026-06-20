using System;

namespace Nimbus.DatabaseStructures.Models;

public class StockAdjustment
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public long WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public long? BinLocationId { get; set; }
    public BinLocation? BinLocation { get; set; }

    public decimal QuantityChanged { get; set; } // positive (add) or negative (remove)
    public string Reason { get; set; } = null!; // e.g. "Damaged Goods", "Found stock"
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public long UserId { get; set; }
    public User User { get; set; } = null!;
}
