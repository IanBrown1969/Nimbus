using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class Customer
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string CustomerRef { get; set; } = null!; // Unique reference: e.g. CUST-0001
    public string Name { get; set; } = null!;
    public string CompanyName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string DefaultCurrencyCode { get; set; } = "GBP";
    public bool IsActive { get; set; } = true;
    public int CreditContractDays { get; set; } = 30;

    public long? CountryId { get; set; }
    public Country? Country { get; set; }

    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
}
