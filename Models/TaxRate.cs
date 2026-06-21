using System;

namespace Nimbus.DatabaseStructures.Models;

public class TaxRate
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long BaseCountryId { get; set; }
    public Country BaseCountry { get; set; } = null!;

    public long? DeliveryCountryId { get; set; }
    public Country? DeliveryCountry { get; set; }

    public long? DeliveryZoneId { get; set; }
    public TaxZone? DeliveryZone { get; set; }

    public long TaxClassId { get; set; }
    public TaxClass TaxClass { get; set; } = null!;

    public decimal Rate { get; set; } // e.g. 0.2000
}
