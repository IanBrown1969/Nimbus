using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Nimbus.DatabaseStructures.Data;

namespace Nimbus.AdminApi.Services;

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public static long? MockTenantId { get; set; }
    public static string? MockSubdomain { get; set; }

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public long? TenantId
    {
        get
        {
            if (MockTenantId.HasValue) return MockTenantId;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            // 1. Resolve from JWT User Claims
            var user = httpContext.User;
            var tenantClaim = user.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(tenantClaim) && long.TryParse(tenantClaim, out var tenantIdVal))
            {
                return tenantIdVal;
            }

            // 2. Resolve from Header (useful during login or integrations)
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantHeader))
            {
                if (long.TryParse(tenantHeader.ToString(), out var headerIdVal))
                {
                    return headerIdVal;
                }
            }

            // 3. Fallback (e.g. resolve via query string or path for testing)
            if (httpContext.Request.Query.TryGetValue("tenantId", out var queryVal))
            {
                if (long.TryParse(queryVal.ToString(), out var queryIdVal))
                {
                    return queryIdVal;
                }
            }

            return null;
        }
    }

    public string? Subdomain
    {
        get
        {
            if (!string.IsNullOrEmpty(MockSubdomain)) return MockSubdomain;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            // 1. Resolve from JWT User Claims
            var user = httpContext.User;
            var subClaim = user.FindFirst("Subdomain")?.Value;
            if (!string.IsNullOrEmpty(subClaim))
            {
                return subClaim;
            }

            // 2. Resolve from Header (useful during login or integrations)
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-Subdomain", out var subHeader))
            {
                return subHeader.ToString();
            }

            // 3. Resolve from Query Parameter
            if (httpContext.Request.Query.TryGetValue("subdomain", out var queryVal))
            {
                return queryVal.ToString();
            }

            // 4. Resolve from Host name (e.g., acme.localhost -> acme)
            var host = httpContext.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length > 1 && !parts[0].Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                return parts[0];
            }

            return null;
        }
    }

    public string? PreferredLanguageCode
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return "en-GB";

            // Resolve from user claims
            var langClaim = httpContext.User.FindFirst("PreferredLanguage")?.Value;
            if (!string.IsNullOrEmpty(langClaim)) return langClaim;

            // Resolve from Header
            if (httpContext.Request.Headers.TryGetValue("X-Locale", out var localeHeader))
            {
                return localeHeader.ToString();
            }

            // Resolve from Accept-Language
            var acceptLang = httpContext.Request.Headers.AcceptLanguage.ToString();
            if (!string.IsNullOrEmpty(acceptLang))
            {
                var firstLang = acceptLang.Split(',').FirstOrDefault()?.Split(';').FirstOrDefault();
                if (!string.IsNullOrEmpty(firstLang)) return firstLang.Trim();
            }

            return "en-GB";
        }
    }

    public string? Username
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return "System";

            var user = httpContext.User;
            var nameClaim = user.FindFirst(ClaimTypes.Name)?.Value 
                            ?? user.FindFirst("Username")?.Value 
                            ?? user.Identity?.Name;
            if (!string.IsNullOrEmpty(nameClaim))
            {
                return nameClaim;
            }

            if (httpContext.Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeader))
            {
                var keyStr = apiKeyHeader.ToString();
                return $"API-Key: {keyStr.Substring(0, Math.Min(keyStr.Length, 8))}...";
            }

            return "Anonymous";
        }
    }
}
