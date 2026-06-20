using System;

namespace Nimbus.DatabaseStructures.Models;

public class RolePermission
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public UserRole Role { get; set; }
    public string Area { get; set; } = null!; // e.g. financials, sales, purchasing, banking, inventory, hr, admin
    public bool IsAllowed { get; set; }
}
