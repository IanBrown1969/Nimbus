using System;

namespace Nimbus.DatabaseStructures.Models;

public class SalesOrderLine
{
    public long Id { get; set; }
public long SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    
    public decimal TaxRate { get; set; } // e.g. 0.20
    public decimal TaxAmount => Quantity * UnitPrice * TaxRate;
    public decimal NetAmount => Quantity * UnitPrice;
    public decimal GrossAmount => NetAmount + TaxAmount;
}
