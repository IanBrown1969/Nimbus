using System;

namespace Nimbus.DatabaseStructures.Models;

public enum AccountingDimensionType
{
    Department,
    Project
}

public class AccountingDimension
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public AccountingDimensionType Type { get; set; }
    public string Code { get; set; } = null!; // e.g. "MKTG", "RND", "PROJ-ALPHA"
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
