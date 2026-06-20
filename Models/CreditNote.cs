using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class CreditNote
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string CreditNoteNumber { get; set; } = null!; // e.g. CN-2026-0001
    public long? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public string CustomerName { get; set; } = null!;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public decimal TotalNet { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalGross => TotalNet + TotalTax;
    public string Status { get; set; } = "Issued"; // Issued, Applied

    public ICollection<CreditNoteLine> Lines { get; set; } = new List<CreditNoteLine>();
}
