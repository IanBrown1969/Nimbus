using System;

namespace Nimbus.DatabaseStructures.Models;

public class ShipmentLine
{
    public long Id { get; set; }
public long ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public decimal QuantityShipped { get; set; }
}
