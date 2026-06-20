using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class LedgerEntry
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = null!;
    public string Reference { get; set; } = null!; // e.g. "Invoice INV-2026-0001", "PO Goods Receipt GRN-2026-0001"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<LedgerLine> Lines { get; set; } = new List<LedgerLine>();
}
