using System;
using System.Collections.Concurrent;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Services;

public class TenantConnectionService : ITenantConnectionService
{
    private readonly ITenantProvider _tenantProvider;
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;
    
    // In-memory connection string cache
    private static readonly ConcurrentDictionary<string, string> _connectionStringCache = new();

    public TenantConnectionService(
        ITenantProvider tenantProvider, 
        IConfiguration configuration,
        IServiceProvider serviceProvider)
    {
        _tenantProvider = tenantProvider;
        _configuration = configuration;
        _serviceProvider = serviceProvider;
    }

    public string GetConnectionString()
    {
        var tenantId = _tenantProvider.TenantId;
        var subdomain = _tenantProvider.Subdomain;

        var baseConnString = _configuration.GetConnectionString("CatalogConnection") 
            ?? "Server=localhost,1434;Database=NimbusCatalogDb;User Id=sa;Password=NimbusSqlPassword2026!;TrustServerCertificate=True;MultipleActiveResultSets=true";

        // Fallback if no tenant context is parsed (e.g. migration tools, global seeding context)
        if (!tenantId.HasValue && string.IsNullOrEmpty(subdomain))
        {
            return baseConnString;
        }

        // Generate cache keys
        var cacheKey = tenantId.HasValue 
            ? $"id_{tenantId.Value}" 
            : $"sub_{subdomain?.ToLower()}";

        if (_connectionStringCache.TryGetValue(cacheKey, out var cachedConnString))
        {
            return cachedConnString;
        }

        // Query the catalog database dynamically using CatalogDbContext
        using (var scope = _serviceProvider.CreateScope())
        {
            var catalogContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            Tenant? tenant = null;

            if (tenantId.HasValue)
            {
                tenant = catalogContext.Tenants.FirstOrDefault(t => t.Id == tenantId.Value);
            }
            else if (!string.IsNullOrEmpty(subdomain))
            {
                tenant = catalogContext.Tenants.FirstOrDefault(t => t.Subdomain.ToLower() == subdomain.ToLower());
            }

            if (tenant != null)
            {
                string resolvedConnString;
                if (!string.IsNullOrEmpty(tenant.ConnectionString))
                {
                    resolvedConnString = tenant.ConnectionString;
                }
                else
                {
                    var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnString)
                    {
                        InitialCatalog = $"NimbusTenant_{tenant.Subdomain}_{tenant.Id:N}"
                    };
                    resolvedConnString = builder.ConnectionString;
                }

                // Cache connection string under both ID and Subdomain for fast lookup
                _connectionStringCache.TryAdd($"id_{tenant.Id}", resolvedConnString);
                _connectionStringCache.TryAdd($"sub_{tenant.Subdomain.ToLower()}", resolvedConnString);

                return resolvedConnString;
            }
        }

        // If not found in catalog, fall back to default catalog (e.g. for initial bootstrap)
        return baseConnString;
    }

    public static void ClearCache()
    {
        _connectionStringCache.Clear();
    }
}
