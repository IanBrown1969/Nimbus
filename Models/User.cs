using System;

namespace Nimbus.DatabaseStructures.Models;

public enum UserRole
{
    GlobalAdmin,
    CompanyAdmin,
    Accounts,
    Warehouse,
    Sales,
    Integration
}

public class User
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; }
    public string PreferredLanguageCode { get; set; } = "en-GB";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
