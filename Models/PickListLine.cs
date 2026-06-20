using System;

namespace Nimbus.DatabaseStructures.Models;

public class PickListLine
{
    public long Id { get; set; }
public long PickListId { get; set; }
    public PickList PickList { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public long WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public long? BinLocationId { get; set; } // Recommendation from system or selected bin
    public BinLocation? BinLocation { get; set; }

    public decimal QuantityToPick { get; set; }
    public decimal QuantityPicked { get; set; }
}
