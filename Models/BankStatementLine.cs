using System;

namespace Nimbus.DatabaseStructures.Models;

public class BankStatementLine
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long BankAccountId { get; set; }
    public BankAccount BankAccount { get; set; } = null!;

    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = null!;
    public string Reference { get; set; } = "";
    
    // Positive for cash deposit (Debit bank), Negative for cash payment (Credit bank)
    public decimal Amount { get; set; } 

    public bool IsReconciled { get; set; } = false;
    public long? ReconciledLedgerLineId { get; set; } // Reference to matched double-entry posting
}
