using System;

namespace Nimbus.DatabaseStructures.Models;

public class Warehouse
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Code { get; set; } = null!; // e.g. "WH-MAIN", "WH-WEST"
    public string Name { get; set; } = null!;
    public string AddressLine1 { get; set; } = null!;
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string City { get; set; } = null!;
    public string PostalCode { get; set; } = null!;

    public long? CountryId { get; set; }
    public Country? Country { get; set; }
}
