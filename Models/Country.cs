using System;

namespace Nimbus.DatabaseStructures.Models;

public class Country
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Code { get; set; } = null!; // ISO 2-letter code, e.g. "GB", "FR", "DE"
    public string Iso3 { get; set; } = null!; // ISO 3-letter code, e.g. "GBR", "FRA", "DEU"
    public string Name { get; set; } = null!;

    public bool IsBaseCountry { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public long? TaxZoneId { get; set; }
    public TaxZone? TaxZone { get; set; }
}
