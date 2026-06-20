using System;

namespace Nimbus.DatabaseStructures.Models;

public class Employee
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string NationalInsuranceNumber { get; set; } = null!; // e.g. "QQ123456C"
    public string TaxCode { get; set; } = "1257L"; // Standard standard UK personal allowance
    
    public decimal MonthlySalary { get; set; } // Base salary in GBP
    public bool IsActive { get; set; } = true;
}
