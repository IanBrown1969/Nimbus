using System;

namespace Nimbus.DatabaseStructures.Models;

public enum ContactType
{
    Customer,
    Supplier
}

public class Contact
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string CompanyName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string DefaultCurrencyCode { get; set; } = "GBP";
    public ContactType Type { get; set; }
    public bool IsActive { get; set; } = true;

    public long? CountryId { get; set; }
    public Country? Country { get; set; }
}
