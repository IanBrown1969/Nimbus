using System;

namespace Nimbus.DatabaseStructures.Models;

public class PurchaseOrderLine
{
    public long Id { get; set; }
public long PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    // Quantities are in Stocking units of sale
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; } // in transaction currency (e.g. USD)
    public decimal ReceivedQuantity { get; set; } // items physically delivered so far
}
