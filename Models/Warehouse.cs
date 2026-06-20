using System;

namespace Nimbus.DatabaseStructures.Models;

public class Warehouse
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Code { get; set; } = null!; // e.g. "WH-MAIN", "WH-WEST"
    public string Name { get; set; } = null!;
    public string? Address { get; set; }
}
