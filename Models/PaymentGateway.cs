using System;

namespace Nimbus.DatabaseStructures.Models;

public class PaymentGateway
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string Provider { get; set; } = null!;
    public string Status { get; set; } = "inactive"; // "active" | "inactive"
    public long SettlementAccountId { get; set; }
    public string ProcessingFee { get; set; } = null!;
    
    // Encrypted API credential config secrets (stored local to Tenant)
    public string? SecretKey { get; set; }
    public string? WebhookSecret { get; set; }
}
