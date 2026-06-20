using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum ExpenseClaimStatus
{
    Submitted,
    Approved,
    Paid,
    Rejected
}

public class ExpenseClaim
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime ClaimDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = null!;
    
    public string CurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRateToBase { get; set; } = 1.0m;

    public ExpenseClaimStatus Status { get; set; } = ExpenseClaimStatus.Submitted;

    public long? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }

    public string? ReceiptUrl { get; set; }

    public ICollection<ExpenseClaimLine> Lines { get; set; } = new List<ExpenseClaimLine>();
}
