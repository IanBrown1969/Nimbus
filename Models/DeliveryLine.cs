using System;

namespace Nimbus.DatabaseStructures.Models;

public class DeliveryLine
{
    public long Id { get; set; }
public long DeliveryId { get; set; }
    public Delivery Delivery { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    // Quantities delivered are in Stocking units of sale
    public decimal QuantityDelivered { get; set; }
    
    public long WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public long? BinLocationId { get; set; } // Bin where items were stored
    public BinLocation? BinLocation { get; set; }
}
