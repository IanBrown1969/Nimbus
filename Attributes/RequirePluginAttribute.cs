using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Nimbus.DatabaseStructures.Data;

namespace Nimbus.AdminApi.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequirePluginAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _pluginCode;

    public RequirePluginAttribute(string pluginCode)
    {
        _pluginCode = pluginCode;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var dbContext = context.HttpContext.RequestServices.GetRequiredService<NimbusDbContext>();
        var tenantProvider = context.HttpContext.RequestServices.GetRequiredService<ITenantProvider>();

        var tenantId = tenantProvider.TenantId;
        if (tenantId == null || tenantId == 0)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Tenant context is missing." });
            return;
        }

        // Check if the tenant has an active subscription for this plugin
        // Note: Query filter automatically restricts search to current TenantId for TenantPlugins
        var hasPlugin = dbContext.TenantPlugins
            .Any(tp => tp.Plugin.Code == _pluginCode && tp.IsActive);

        if (!hasPlugin)
        {
            context.Result = new ObjectResult(new
            {
                message = $"The module '{_pluginCode}' is not active for your company tenant. Please subscribe to this plugin in the App settings to unlock these features.",
                pluginCode = _pluginCode,
                requiredAction = "UpgradeSubscription"
            })
            {
                StatusCode = 402 // Payment Required
            };
            return;
        }

        await next();
    }
}
