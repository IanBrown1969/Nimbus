using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class TaxZone
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!; // e.g. "UK", "EU", "US"
    public string? Description { get; set; }

    public ICollection<Country> Countries { get; set; } = new List<Country>();
}
