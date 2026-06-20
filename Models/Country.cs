using System;

namespace Nimbus.DatabaseStructures.Models;

public class Country
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Code { get; set; } = null!; // ISO 2-letter code, e.g. "GB", "FR", "DE"
    public string Name { get; set; } = null!;
}
