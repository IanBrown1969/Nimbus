using System;

namespace Nimbus.DatabaseStructures.Models;

public class GrantProgram
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string Donor { get; set; } = null!;
    public decimal TotalBudget { get; set; }
    public decimal AllocatedBudget { get; set; }
    public decimal Spent { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "active"; // "active" | "completed" | "audited"
    public int ComplianceScore { get; set; } = 100;
}
