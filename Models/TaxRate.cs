using System;

namespace Nimbus.DatabaseStructures.Models;

public class TaxRate
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long CountryId { get; set; }
    public Country Country { get; set; } = null!;

    public long TaxClassId { get; set; }
    public TaxClass TaxClass { get; set; } = null!;

    public decimal Rate { get; set; } // e.g. 0.2000
}
