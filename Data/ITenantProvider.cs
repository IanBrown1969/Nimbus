using System;

namespace Nimbus.DatabaseStructures.Data;

public interface ITenantProvider
{
    long? TenantId { get; }
    string? Subdomain { get; }
    string? PreferredLanguageCode { get; }
    string? Username { get; }
}
