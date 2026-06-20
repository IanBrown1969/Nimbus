using System;

namespace Nimbus.DatabaseStructures.Models;

public class BankAccount
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string AccountName { get; set; } = null!;
    public string AccountNumber { get; set; } = null!;
    public string SortCode { get; set; } = null!;
    
    public string CurrencyCode { get; set; } = "GBP";
    public decimal CurrentBalance { get; set; }
    public string BankName { get; set; } = null!;
    
    public bool IsFeedConnected { get; set; } = false;
    public DateTime? LastSyncedAt { get; set; }
}
