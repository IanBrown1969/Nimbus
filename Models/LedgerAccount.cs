using System;

namespace Nimbus.DatabaseStructures.Models;

public enum LedgerAccountType
{
    Revenue = 0,
    Expense = 1,
    Asset = 2,
    Liability = 3,
    Equity = 4
}

public class LedgerAccount
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string AccountCode { get; set; } = null!; // e.g. "1000", "2010"
    public string Name { get; set; } = null!; // e.g. "Sales Revenue", "Travel Meals"
    public LedgerAccountType Type { get; set; }
    public string? Description { get; set; }
}
