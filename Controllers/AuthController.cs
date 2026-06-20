using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using Nimbus.AdminApi.Services;

namespace Nimbus.AdminApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly CatalogDbContext _catalogContext;
    private readonly IConfiguration _config;

    public AuthController(CatalogDbContext catalogContext, IConfiguration config)
    {
        _catalogContext = catalogContext;
        _config = config;
    }

    public class LoginRequest
    {
        public string Subdomain { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Set mock subdomain context to resolve connection string
            TenantProvider.MockSubdomain = request.Subdomain;

            // 1. Find tenant by subdomain in Catalog DB
            var tenant = await _catalogContext.Tenants
                .FirstOrDefaultAsync(t => t.Subdomain.ToLower() == request.Subdomain.ToLower() && t.IsActive);

            if (tenant == null)
            {
                return BadRequest(new { message = "Company subdomain does not exist or is inactive." });
            }

            // Lock in mock tenant ID
            TenantProvider.MockTenantId = tenant.Id;

            // 2. Hash input password
            var hashedPassword = HashPassword(request.Password);

            // 3. Find user belonging to the tenant inside their isolated database
            var tenantContext = HttpContext.RequestServices.GetRequiredService<NimbusDbContext>();
            var user = await tenantContext.Users
                .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower() && u.IsActive);

            if (user == null || user.PasswordHash != hashedPassword)
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            // 4. Generate JWT Token
            var token = GenerateJwtToken(user, tenant);

            return Ok(new
            {
                token = token,
                username = user.Username,
                role = user.Role.ToString(),
                tenantId = tenant.Id,
                tenantName = tenant.Name,
                language = user.PreferredLanguageCode,
                currency = tenant.DefaultCurrencyCode,
                subscriptionPlan = tenant.SubscriptionPlan,
                planPrice = tenant.PlanPrice,
                subscriptionStatus = tenant.SubscriptionStatus
            });
        }
        finally
        {
            // Clear mock context
            TenantProvider.MockTenantId = null;
            TenantProvider.MockSubdomain = null;
        }
    }

    public class RegisterTenantRequest
    {
        public string Subdomain { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string AdminUsername { get; set; } = null!;
        public string AdminEmail { get; set; } = null!;
        public string AdminPassword { get; set; } = null!;
        public string DefaultCurrencyCode { get; set; } = "GBP";
        public string DefaultLanguageCode { get; set; } = "en-GB";
        public string SubscriptionPlan { get; set; } = "Standard";
    }

    [HttpPost("register-tenant")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterTenant([FromBody] RegisterTenantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Subdomain) || string.IsNullOrWhiteSpace(request.CompanyName))
        {
            return BadRequest(new { message = "Subdomain and Company Name are required." });
        }

        // Clean subdomain format
        var subdomain = new string(request.Subdomain.ToLower().Where(char.IsLetterOrDigit).ToArray());
        if (subdomain.Length < 3)
        {
            return BadRequest(new { message = "Subdomain must be at least 3 alphanumeric characters." });
        }

        var existing = await _catalogContext.Tenants.AnyAsync(t => t.Subdomain.ToLower() == subdomain);
        if (existing)
        {
            return BadRequest(new { message = $"Company subdomain '{subdomain}' is already registered." });
        }

        try
        {
            var planPrice = request.SubscriptionPlan.ToLower() switch
            {
                "starter" => 29.99m,
                "premium" => 99.99m,
                _ => 59.99m
            };
            var planName = request.SubscriptionPlan.ToLower() switch
            {
                "starter" => "Starter",
                "premium" => "Premium",
                _ => "Standard"
            };

            // 1. Create Tenant registry in Catalog DB
            var tenant = new Tenant
            {
                Name = request.CompanyName,
                Subdomain = subdomain,
                DefaultLanguageCode = request.DefaultLanguageCode,
                DefaultCurrencyCode = request.DefaultCurrencyCode,
                SubscriptionPlan = planName,
                PlanPrice = planPrice,
                SubscriptionStatus = "Active",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _catalogContext.Tenants.Add(tenant);
            await _catalogContext.SaveChangesAsync();

            // Clear cache
            TenantConnectionService.ClearCache();

            // 2. Set Mock Tenant Context for database generation
            TenantProvider.MockTenantId = tenant.Id;
            TenantProvider.MockSubdomain = tenant.Subdomain;

            var allPlugins = await _catalogContext.Plugins.ToListAsync();
            var tenantPlugins = await _catalogContext.TenantPlugins.ToListAsync();

            // 3. Create and seed the tenant-specific isolated database
            using (var scope = HttpContext.RequestServices.CreateScope())
            {
                var tenantContext = scope.ServiceProvider.GetRequiredService<NimbusDbContext>();
                
                DbInitializer.InitializeTenant(tenantContext, tenant, allPlugins, tenantPlugins);

                var hashedPassword = HashPassword(request.AdminPassword);
                var adminUser = new User
                {
                    TenantId = tenant.Id,
                    Username = request.AdminUsername,
                    Email = request.AdminEmail,
                    PasswordHash = hashedPassword,
                    Role = UserRole.CompanyAdmin,
                    PreferredLanguageCode = request.DefaultLanguageCode,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                tenantContext.Users.Add(adminUser);
                await tenantContext.SaveChangesAsync();
            }

            return Ok(new
            {
                message = "Tenant registered and database provisioned successfully.",
                subdomain = tenant.Subdomain,
                tenantId = tenant.Id
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "An error occurred while provisioning the tenant database.",
                details = ex.Message
            });
        }
        finally
        {
            // Clear mock context
            TenantProvider.MockTenantId = null;
            TenantProvider.MockSubdomain = null;
        }
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        var sb = new StringBuilder();
        foreach (var b in bytes)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    private string GenerateJwtToken(User user, Tenant tenant)
    {
        var secret = _config["Jwt:Secret"] ?? "NimbusERP_Super_Secret_Encryption_Key_2026";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("TenantId", tenant.Id.ToString()),
            new Claim("PreferredLanguage", user.PreferredLanguageCode),
            new Claim("Subdomain", tenant.Subdomain)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "NimbusERP",
            audience: _config["Jwt:Audience"] ?? "NimbusAdmin",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
