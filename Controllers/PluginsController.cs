using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.AdminApi.Controllers;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/plugins")]
public class PluginsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly CatalogDbContext _catalogContext;

    public PluginsController(NimbusDbContext context, CatalogDbContext catalogContext)
    {
        _context = context;
        _catalogContext = catalogContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlugins()
    {
        // 1. Get all available plugins globally from Catalog DB
        var allPlugins = await _catalogContext.Plugins.ToListAsync();

        // 2. Get active tenant plugins from Catalog DB
        var activeTenantPlugins = await _catalogContext.TenantPlugins
            .Where(tp => tp.TenantId == UserTenantId && tp.IsActive)
            .Select(tp => tp.PluginId)
            .ToListAsync();

        var result = allPlugins.Select(p => new
        {
            p.Id,
            p.Code,
            p.Name,
            p.Description,
            p.MonthlyPrice,
            IsSubscribed = activeTenantPlugins.Contains(p.Id)
        });

        return Ok(result);
    }

    [HttpPost("toggle")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> TogglePlugin([FromBody] TogglePluginRequest request)
    {
        var plugin = await _catalogContext.Plugins.FirstOrDefaultAsync(p => p.Code == request.PluginCode && p.IsActive);
        if (plugin == null)
        {
            return NotFound(new { message = $"Plugin '{request.PluginCode}' not found." });
        }

        // 1. Update/create subscription inside Catalog DB
        var catalogTenantPlugin = await _catalogContext.TenantPlugins
            .FirstOrDefaultAsync(tp => tp.TenantId == UserTenantId && tp.PluginId == plugin.Id);

        bool nextActiveStatus;
        if (catalogTenantPlugin != null)
        {
            catalogTenantPlugin.IsActive = !catalogTenantPlugin.IsActive;
            if (catalogTenantPlugin.IsActive)
            {
                catalogTenantPlugin.EnabledDate = DateTime.UtcNow;
            }
            nextActiveStatus = catalogTenantPlugin.IsActive;
        }
        else
        {
            catalogTenantPlugin = new TenantPlugin
            {
                TenantId = UserTenantId,
                PluginId = plugin.Id,
                IsActive = true,
                EnabledDate = DateTime.UtcNow
            };
            _catalogContext.TenantPlugins.Add(catalogTenantPlugin);
            nextActiveStatus = true;
        }
        await _catalogContext.SaveChangesAsync();

        // 2. Update/create subscription inside Tenant-specific DB
        var tenantPlugin = await _context.TenantPlugins
            .FirstOrDefaultAsync(tp => tp.PluginId == plugin.Id);

        if (tenantPlugin != null)
        {
            tenantPlugin.IsActive = nextActiveStatus;
            if (nextActiveStatus)
            {
                tenantPlugin.EnabledDate = DateTime.UtcNow;
            }
        }
        else
        {
            tenantPlugin = new TenantPlugin
            {
                TenantId = UserTenantId,
                PluginId = plugin.Id,
                IsActive = nextActiveStatus,
                EnabledDate = DateTime.UtcNow
            };
            _context.TenantPlugins.Add(tenantPlugin);
        }
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Successfully {(nextActiveStatus ? "subscribed to" : "unsubscribed from")} the {plugin.Name} plugin module.",
            pluginCode = plugin.Code,
            isSubscribed = nextActiveStatus
        });
    }

    public class TogglePluginRequest
    {
        public string PluginCode { get; set; } = null!;
    }
}
