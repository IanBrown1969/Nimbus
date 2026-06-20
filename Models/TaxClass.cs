using System;

namespace Nimbus.DatabaseStructures.Models;

public class TaxClass
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Code { get; set; } = null!; // e.g. "STD", "RED", "ZERO"
    public string Name { get; set; } = null!;
}
