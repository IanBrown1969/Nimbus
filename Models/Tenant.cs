using System;

namespace Nimbus.DatabaseStructures.Models;

public class Tenant
{
    public long Id { get; set; }
public string Name { get; set; } = null!;
    public string Subdomain { get; set; } = null!;
    public string DefaultLanguageCode { get; set; } = "en-GB"; // Default locale
    public string DefaultCurrencyCode { get; set; } = "GBP"; // Default base reporting currency
    public string? ConnectionString { get; set; }
    public string SubscriptionPlan { get; set; } = "Standard"; // Starter, Standard, Premium
    public decimal PlanPrice { get; set; } = 59.99m;
    public string SubscriptionStatus { get; set; } = "Active";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
