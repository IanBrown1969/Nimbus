using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum QuoteStatus
{
    Draft,
    Sent,
    Accepted,
    Declined
}

public class Quote
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string QuoteNumber { get; set; } = null!; // e.g. EST-2026-0001
    public string CustomerName { get; set; } = null!;
    
    public DateTime QuoteDate { get; set; } = DateTime.UtcNow;
    public DateTime ExpiryDate { get; set; } = DateTime.UtcNow.AddDays(30);

    public string CurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRateToBase { get; set; } = 1.0m;

    public decimal TotalNet { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalGross => TotalNet + TotalTax;

    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;

    public ICollection<QuoteLine> Lines { get; set; } = new List<QuoteLine>();
}
