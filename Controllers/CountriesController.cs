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
[Route("api/countries")]
public class CountriesController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public CountriesController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Warehouse,Sales,Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetActiveCountries()
    {
        var countries = await _context.Countries
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(countries);
    }

    [HttpGet("all")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetAllCountries()
    {
        var countries = await _context.Countries
            .Include(c => c.TaxZone)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(countries);
    }

    [HttpPost("{id}/toggle")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ToggleCountry(long id)
    {
        var country = await _context.Countries.FindAsync(id);
        if (country == null)
        {
            return NotFound();
        }

        country.IsActive = !country.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Country '{country.Name}' is now {(country.IsActive ? "active" : "inactive")}.", country });
    }

    [HttpPost("{id}/toggle-base")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ToggleBaseCountry(long id)
    {
        var country = await _context.Countries.FindAsync(id);
        if (country == null)
        {
            return NotFound();
        }

        country.IsBaseCountry = !country.IsBaseCountry;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Country '{country.Name}' base operating country status is now {(country.IsBaseCountry ? "enabled" : "disabled")}.", country });
    }

    [HttpPost("{id}/zone")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> SetCountryZone(long id, [FromBody] SetZoneRequest request)
    {
        var country = await _context.Countries.FindAsync(id);
        if (country == null)
        {
            return NotFound();
        }

        if (request.TaxZoneId.HasValue)
        {
            var zoneExists = await _context.TaxZones.AnyAsync(z => z.Id == request.TaxZoneId.Value);
            if (!zoneExists)
            {
                return BadRequest("Invalid TaxZoneId.");
            }
            country.TaxZoneId = request.TaxZoneId.Value;
        }
        else
        {
            country.TaxZoneId = null;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Updated Tax Zone for '{country.Name}'.", country });
    }

    public class SetZoneRequest
    {
        public long? TaxZoneId { get; set; }
    }
}
