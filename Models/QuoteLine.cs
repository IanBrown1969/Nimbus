using System;

namespace Nimbus.DatabaseStructures.Models;

public class QuoteLine
{
    public long Id { get; set; }
public long QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; }

    public decimal NetAmount => Quantity * UnitPrice;
    public decimal TaxAmount => NetAmount * TaxRate;
}
