using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum InvoiceStatus
{
    Draft,
    Issued,
    Paid,
    Overdue
}

public class Invoice
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string InvoiceNumber { get; set; } = null!; // e.g. INV-2026-0001
    public string CustomerName { get; set; } = null!;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);

    // Multi-currency details
    public string CurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRateToBase { get; set; } = 1.0m;

    // Totals in transaction currency
    public decimal TotalNet { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalGross => TotalNet + TotalTax;

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}
