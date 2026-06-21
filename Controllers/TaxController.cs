using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance/tax")]
public class TaxController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public TaxController(NimbusDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // TAX ZONES ENDPOINTS
    // ==========================================

    [HttpGet("zones")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetTaxZones()
    {
        var zones = await _context.TaxZones
            .Include(z => z.Countries)
            .OrderBy(z => z.Name)
            .ToListAsync();
        return Ok(zones);
    }

    [HttpPost("zones")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateTaxZone([FromBody] CreateTaxZoneRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Tax zone name is required.");
        }

        var zone = new TaxZone
        {
            TenantId = UserTenantId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim()
        };

        _context.TaxZones.Add(zone);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTaxZones), new { id = zone.Id }, zone);
    }

    [HttpPut("zones/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdateTaxZone(long id, [FromBody] CreateTaxZoneRequest request)
    {
        var zone = await _context.TaxZones.FindAsync(id);
        if (zone == null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Tax zone name is required.");
        }

        zone.Name = request.Name.Trim();
        zone.Description = request.Description?.Trim();

        await _context.SaveChangesAsync();
        return Ok(zone);
    }

    [HttpDelete("zones/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> DeleteTaxZone(long id)
    {
        var zone = await _context.TaxZones
            .Include(z => z.Countries)
            .FirstOrDefaultAsync(z => z.Id == id);
            
        if (zone == null)
        {
            return NotFound();
        }

        // Dissociate countries from this tax zone
        foreach (var country in zone.Countries)
        {
            country.TaxZoneId = null;
        }

        _context.TaxZones.Remove(zone);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tax zone successfully deleted." });
    }

    // ==========================================
    // TAX RATES MATRIX ENDPOINTS
    // ==========================================

    [HttpGet("rates")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetTaxRates()
    {
        var rates = await _context.TaxRates
            .Include(r => r.BaseCountry)
            .Include(r => r.DeliveryCountry)
            .Include(r => r.TaxClass)
            .OrderBy(r => r.BaseCountry.Name)
            .ThenBy(r => r.DeliveryCountry.Name)
            .ToListAsync();
        return Ok(rates);
    }

    [HttpPost("rates")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateTaxRate([FromBody] CreateTaxRateRequest request)
    {
        var baseCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.BaseCountryId);
        var deliveryCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.DeliveryCountryId);
        var taxClassExists = await _context.TaxClasses.AnyAsync(tc => tc.Id == request.TaxClassId);

        if (!baseCountryExists || !deliveryCountryExists || !taxClassExists)
        {
            return BadRequest("Invalid BaseCountryId, DeliveryCountryId, or TaxClassId.");
        }

        // Check uniqueness
        var duplicateExists = await _context.TaxRates.AnyAsync(r => 
            r.BaseCountryId == request.BaseCountryId && 
            r.DeliveryCountryId == request.DeliveryCountryId && 
            r.TaxClassId == request.TaxClassId);

        if (duplicateExists)
        {
            return BadRequest("A tax rate rule already exists for this combination of base country, delivery country, and tax class.");
        }

        var taxRate = new TaxRate
        {
            TenantId = UserTenantId,
            BaseCountryId = request.BaseCountryId,
            DeliveryCountryId = request.DeliveryCountryId,
            TaxClassId = request.TaxClassId,
            Rate = request.Rate
        };

        _context.TaxRates.Add(taxRate);
        await _context.SaveChangesAsync();

        var resolved = await _context.TaxRates
            .Include(r => r.BaseCountry)
            .Include(r => r.DeliveryCountry)
            .Include(r => r.TaxClass)
            .FirstOrDefaultAsync(r => r.Id == taxRate.Id);

        return CreatedAtAction(nameof(GetTaxRates), new { id = taxRate.Id }, resolved);
    }

    [HttpPut("rates/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdateTaxRate(long id, [FromBody] UpdateTaxRateRequest request)
    {
        var taxRate = await _context.TaxRates.FindAsync(id);
        if (taxRate == null)
        {
            return NotFound();
        }

        taxRate.Rate = request.Rate;
        await _context.SaveChangesAsync();

        var resolved = await _context.TaxRates
            .Include(r => r.BaseCountry)
            .Include(r => r.DeliveryCountry)
            .Include(r => r.TaxClass)
            .FirstOrDefaultAsync(r => r.Id == taxRate.Id);

        return Ok(resolved);
    }

    [HttpDelete("rates/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> DeleteTaxRate(long id)
    {
        var taxRate = await _context.TaxRates.FindAsync(id);
        if (taxRate == null)
        {
            return NotFound();
        }

        _context.TaxRates.Remove(taxRate);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tax rate rule successfully deleted." });
    }

    // ==========================================
    // DTO REQUESTS
    // ==========================================

    public class CreateTaxZoneRequest
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }

    public class CreateTaxRateRequest
    {
        public long BaseCountryId { get; set; }
        public long DeliveryCountryId { get; set; }
        public long TaxClassId { get; set; }
        public decimal Rate { get; set; }
    }

    public class UpdateTaxRateRequest
    {
        public decimal Rate { get; set; }
    }
}
