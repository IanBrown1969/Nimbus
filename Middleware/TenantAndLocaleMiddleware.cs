using System;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Nimbus.DatabaseStructures.Data;

namespace Nimbus.AdminApi.Middleware;

public class TenantAndLocaleMiddleware
{
    private readonly RequestDelegate _next;

    public TenantAndLocaleMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider)
    {
        // 1. Resolve locale and configure executing thread culture
        var preferredLanguage = tenantProvider.PreferredLanguageCode ?? "en-GB";
        try
        {
            var culture = new CultureInfo(preferredLanguage);
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = culture;
        }
        catch (CultureNotFoundException)
        {
            // Fallback if client passes invalid string
            var fallbackCulture = new CultureInfo("en-GB");
            CultureInfo.CurrentCulture = fallbackCulture;
            CultureInfo.CurrentUICulture = fallbackCulture;
        }

        // 2. Add Tenant Headers for response tracing
        var activeTenantId = tenantProvider.TenantId;
        if (activeTenantId.HasValue)
        {
            context.Response.Headers.Append("X-Resolved-Tenant-ID", activeTenantId.Value.ToString());
            context.Response.Headers.Append("X-Resolved-Locale", CultureInfo.CurrentCulture.Name);
        }

        await _next(context);
    }
}
