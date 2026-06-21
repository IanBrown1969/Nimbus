using System;

namespace Nimbus.DatabaseStructures.Models;

public class CustomerAddress
{
    public long Id { get; set; }
    public long TenantId { get; set; }

    public long CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string AddressName { get; set; } = null!; // e.g., "Billing Main", "Branch Office"
    public string AddressLine1 { get; set; } = null!;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = null!;
    public string? State { get; set; }
    public string PostalCode { get; set; } = null!;

    public long? CountryId { get; set; }
    public Country? Country { get; set; }

    public string AddressType { get; set; } = "Billing"; // "Billing" or "Shipping"
    public bool IsDefault { get; set; } = false;

    public string? TaxCode { get; set; }
}
