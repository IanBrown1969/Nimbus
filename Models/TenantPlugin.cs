using System;

namespace Nimbus.DatabaseStructures.Models;

public class TenantPlugin
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    
    public long PluginId { get; set; }
    public Plugin Plugin { get; set; } = null!;
    
    public DateTime EnabledDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ConfigurationSettingsJson { get; set; }
}
