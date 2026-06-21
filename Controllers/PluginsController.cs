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
        var tenantPlugins = await _catalogContext.TenantPlugins
            .Where(tp => tp.TenantId == UserTenantId)
            .ToListAsync();

        var result = allPlugins.Select(p => {
            var sub = tenantPlugins.FirstOrDefault(tp => tp.PluginId == p.Id);
            return new
            {
                p.Id,
                p.Code,
                p.Name,
                p.Description,
                p.MonthlyPrice,
                IsSubscribed = sub != null && sub.IsActive,
                ConfigurationSettingsJson = sub?.ConfigurationSettingsJson
            };
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

        bool nextActiveStatus = catalogTenantPlugin != null ? !catalogTenantPlugin.IsActive : true;

        // Validation for CDN Storage activation
        if (plugin.Code == "CDN" && nextActiveStatus)
        {
            if (string.IsNullOrWhiteSpace(request.ConfigurationSettingsJson))
            {
                return BadRequest(new { message = "Azure Cloud Storage & CDN configuration is required to activate this module." });
            }
            try
            {
                var settings = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(request.ConfigurationSettingsJson);
                if (settings == null || 
                    !settings.ContainsKey("connectionString") || string.IsNullOrWhiteSpace(settings["connectionString"]) ||
                    !settings.ContainsKey("containerName") || string.IsNullOrWhiteSpace(settings["containerName"]) ||
                    !settings.ContainsKey("cdnEndpointUrl") || string.IsNullOrWhiteSpace(settings["cdnEndpointUrl"]))
                {
                    return BadRequest(new { message = "Azure Cloud Storage configuration is missing required parameters (ConnectionString, ContainerName, CdnEndpointUrl)." });
                }
            }
            catch
            {
                return BadRequest(new { message = "Azure Cloud Storage configuration contains invalid JSON settings." });
            }
        }

        // Validation for BNK Open Banking activation
        if (plugin.Code == "BNK" && nextActiveStatus)
        {
            if (string.IsNullOrWhiteSpace(request.ConfigurationSettingsJson))
            {
                return BadRequest(new { message = "Bank connection settings are required to activate this module." });
            }
            try
            {
                var settings = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(request.ConfigurationSettingsJson);
                if (settings == null || 
                    !settings.ContainsKey("bank") || string.IsNullOrWhiteSpace(settings["bank"]) ||
                    !settings.ContainsKey("clientId") || string.IsNullOrWhiteSpace(settings["clientId"]) ||
                    !settings.ContainsKey("clientSecret") || string.IsNullOrWhiteSpace(settings["clientSecret"]))
                {
                    return BadRequest(new { message = "Bank connection settings are missing required parameters (bank, clientId, clientSecret)." });
                }
            }
            catch
            {
                return BadRequest(new { message = "Bank connection configurations contain invalid JSON settings." });
            }
        }

        if (catalogTenantPlugin != null)
        {
            catalogTenantPlugin.IsActive = !catalogTenantPlugin.IsActive;
            if (catalogTenantPlugin.IsActive)
            {
                catalogTenantPlugin.EnabledDate = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(request.ConfigurationSettingsJson))
                {
                    catalogTenantPlugin.ConfigurationSettingsJson = request.ConfigurationSettingsJson;
                }
            }
            else
            {
                catalogTenantPlugin.ConfigurationSettingsJson = null; // Clear config on deactivation
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
                EnabledDate = DateTime.UtcNow,
                ConfigurationSettingsJson = request.ConfigurationSettingsJson
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
                if (!string.IsNullOrEmpty(request.ConfigurationSettingsJson))
                {
                    tenantPlugin.ConfigurationSettingsJson = request.ConfigurationSettingsJson;
                }
            }
            else
            {
                tenantPlugin.ConfigurationSettingsJson = null; // Clear config on deactivation
            }
        }
        else
        {
            tenantPlugin = new TenantPlugin
            {
                TenantId = UserTenantId,
                PluginId = plugin.Id,
                IsActive = nextActiveStatus,
                EnabledDate = DateTime.UtcNow,
                ConfigurationSettingsJson = nextActiveStatus ? request.ConfigurationSettingsJson : null
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

    [HttpPost("{code}/config")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdatePluginConfig(string code, [FromBody] UpdatePluginConfigRequest request)
    {
        var plugin = await _catalogContext.Plugins.FirstOrDefaultAsync(p => p.Code == code && p.IsActive);
        if (plugin == null)
        {
            return NotFound(new { message = $"Plugin '{code}' not found." });
        }

        // Validate config
        if (code == "CDN")
        {
            if (string.IsNullOrWhiteSpace(request.ConfigurationSettingsJson))
            {
                return BadRequest(new { message = "Azure Cloud Storage & CDN configuration cannot be empty." });
            }
            try
            {
                var settings = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(request.ConfigurationSettingsJson);
                if (settings == null || 
                    !settings.ContainsKey("connectionString") || string.IsNullOrWhiteSpace(settings["connectionString"]) ||
                    !settings.ContainsKey("containerName") || string.IsNullOrWhiteSpace(settings["containerName"]) ||
                    !settings.ContainsKey("cdnEndpointUrl") || string.IsNullOrWhiteSpace(settings["cdnEndpointUrl"]))
                {
                    return BadRequest(new { message = "Azure Cloud Storage configuration is missing required parameters." });
                }
            }
            catch
            {
                return BadRequest(new { message = "Azure Cloud Storage configuration contains invalid JSON settings." });
            }
        }

        if (code == "BNK")
        {
            if (string.IsNullOrWhiteSpace(request.ConfigurationSettingsJson))
            {
                return BadRequest(new { message = "Bank connection settings cannot be empty." });
            }
            try
            {
                var settings = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(request.ConfigurationSettingsJson);
                if (settings == null || 
                    !settings.ContainsKey("bank") || string.IsNullOrWhiteSpace(settings["bank"]) ||
                    !settings.ContainsKey("clientId") || string.IsNullOrWhiteSpace(settings["clientId"]) ||
                    !settings.ContainsKey("clientSecret") || string.IsNullOrWhiteSpace(settings["clientSecret"]))
                {
                    return BadRequest(new { message = "Bank connection settings are missing required parameters (bank, clientId, clientSecret)." });
                }
            }
            catch
            {
                return BadRequest(new { message = "Bank connection configurations contain invalid JSON settings." });
            }
        }

        // Save inside Catalog DB
        var catalogTenantPlugin = await _catalogContext.TenantPlugins
            .FirstOrDefaultAsync(tp => tp.TenantId == UserTenantId && tp.PluginId == plugin.Id);

        if (catalogTenantPlugin == null || !catalogTenantPlugin.IsActive)
        {
            return BadRequest(new { message = "Cannot configure a plugin that is not active." });
        }
        catalogTenantPlugin.ConfigurationSettingsJson = request.ConfigurationSettingsJson;
        await _catalogContext.SaveChangesAsync();

        // Save inside Tenant DB
        var tenantPlugin = await _context.TenantPlugins
            .FirstOrDefaultAsync(tp => tp.PluginId == plugin.Id);

        if (tenantPlugin != null)
        {
            tenantPlugin.ConfigurationSettingsJson = request.ConfigurationSettingsJson;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = $"Successfully updated {plugin.Name} plugin configuration settings." });
    }

    public class TogglePluginRequest
    {
        public string PluginCode { get; set; } = null!;
        public string? ConfigurationSettingsJson { get; set; }
    }

    public class UpdatePluginConfigRequest
    {
        public string ConfigurationSettingsJson { get; set; } = null!;
    }
}
