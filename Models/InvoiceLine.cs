using System;

namespace Nimbus.DatabaseStructures.Models;

public class InvoiceLine
{
    public long Id { get; set; }
public long InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    // Quantities are in Selling units of sale
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; } // in transaction currency (e.g. USD)
    
    // UK tax calculations (e.g. 0.20 for 20% VAT)
    public decimal TaxRate { get; set; } // VAT rate
    public decimal TaxAmount => Quantity * UnitPrice * TaxRate; // In transaction currency
    public decimal NetAmount => Quantity * UnitPrice; // In transaction currency
    public decimal GrossAmount => NetAmount + TaxAmount;

    // SAP B1 Style Fixed dimensions
    public long? DepartmentDimensionId { get; set; }
    public AccountingDimension? DepartmentDimension { get; set; }

    public long? ProjectDimensionId { get; set; }
    public AccountingDimension? ProjectDimension { get; set; }
}
