using System;

namespace Nimbus.DatabaseStructures.Models;

public class CreditNoteLine
{
    public long Id { get; set; }
public long CreditNoteId { get; set; }
    public CreditNote CreditNote { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    
    public decimal TaxRate { get; set; } // e.g. 0.20
    public decimal TaxAmount => Quantity * UnitPrice * TaxRate;
    public decimal NetAmount => Quantity * UnitPrice;
    public decimal GrossAmount => NetAmount + TaxAmount;
}
