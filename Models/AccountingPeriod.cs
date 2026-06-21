using System;

namespace Nimbus.DatabaseStructures.Models;

public class AccountingPeriod
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!; // e.g. "2026-06 June"
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? ClosedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? CloseNotes { get; set; }
}
