using System;

namespace Nimbus.DatabaseStructures.Models;

public class Supplier
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string DefaultCurrencyCode { get; set; } = "GBP"; // Default currency for supplier transactions
    public bool IsActive { get; set; } = true;
}
