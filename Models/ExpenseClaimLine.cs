using System;

namespace Nimbus.DatabaseStructures.Models;

public class ExpenseClaimLine
{
    public long Id { get; set; }
public long ExpenseClaimId { get; set; }
    public ExpenseClaim ExpenseClaim { get; set; } = null!;

    public string Category { get; set; } = null!; // e.g. "Travel", "Office Supplies", "Client Meals"
    public string Description { get; set; } = null!;

    public decimal NetAmount { get; set; } // in transaction currency
    public decimal TaxAmount { get; set; } // in transaction currency
    public decimal TaxRate { get; set; } // VAT rate e.g. 0.20m

    public decimal GrossAmount => NetAmount + TaxAmount;
}
