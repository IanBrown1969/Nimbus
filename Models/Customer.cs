using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nimbus.DatabaseStructures.Models;

public class AgedDebtBreakdown
{
    public decimal Current { get; set; } // 0-30 days
    public decimal Over30 { get; set; }  // 31-60 days
    public decimal Over60 { get; set; }  // 61-90 days
    public decimal Over90 { get; set; }  // 90+ days
}

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

    public long? ServedFromCountryId { get; set; }
    public Country? ServedFromCountry { get; set; }

    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();

    [NotMapped]
    public decimal TotalDebt { get; set; }

    [NotMapped]
    public AgedDebtBreakdown AgedDebt { get; set; } = new AgedDebtBreakdown();
}
