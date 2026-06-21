using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using Nimbus.AdminApi.Services;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance/tax")]
public class TaxController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly ISalesOrderService _salesOrderService;

    public TaxController(NimbusDbContext context, ISalesOrderService salesOrderService)
    {
        _context = context;
        _salesOrderService = salesOrderService;
    }

    [HttpGet("resolve")]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ResolveTaxRate(
        [FromQuery] string customerName, 
        [FromQuery] long stockItemId, 
        [FromQuery] long? deliveryAddressId,
        [FromQuery] string? deliveryCountryCode)
    {
        var stockItem = await _context.StockItems.FindAsync(stockItemId);
        if (stockItem == null)
        {
            return NotFound("Stock item not found.");
        }

        var rate = await _salesOrderService.ResolveTaxRateForAddressAsync(customerName, stockItem, deliveryAddressId, deliveryCountryCode, 0.0m);
        return Ok(new { rate });
    }

    [HttpGet("options")]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetTaxOptions(
        [FromQuery] string customerName,
        [FromQuery] long? deliveryAddressId,
        [FromQuery] string? deliveryCountryCode)
    {
        if (string.IsNullOrWhiteSpace(customerName))
        {
            return BadRequest("Customer name is required.");
        }
        var options = await _salesOrderService.GetTaxOptionsForAddressAsync(customerName, deliveryAddressId, deliveryCountryCode);
        return Ok(options);
    }

    [HttpGet("classes")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetTaxClasses()
    {
        var classes = await _context.TaxClasses.ToListAsync();
        return Ok(classes);
    }

    [HttpPost("classes")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateTaxClass([FromBody] CreateTaxClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Tax class code and name are required.");
        }

        var duplicateExists = await _context.TaxClasses.AnyAsync(tc => 
            tc.TenantId == UserTenantId && 
            (tc.Code == request.Code.Trim() || tc.Name == request.Name.Trim()));

        if (duplicateExists)
        {
            return BadRequest("A tax class with this code or name already exists.");
        }

        var taxClass = new TaxClass
        {
            TenantId = UserTenantId,
            Code = request.Code.Trim().ToUpper(),
            Name = request.Name.Trim()
        };

        _context.TaxClasses.Add(taxClass);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTaxClasses), new { id = taxClass.Id }, taxClass);
    }

    [HttpPut("classes/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> UpdateTaxClass(long id, [FromBody] CreateTaxClassRequest request)
    {
        var taxClass = await _context.TaxClasses.FindAsync(id);
        if (taxClass == null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Tax class code and name are required.");
        }

        var duplicateExists = await _context.TaxClasses.AnyAsync(tc => 
            tc.Id != id &&
            tc.TenantId == UserTenantId && 
            (tc.Code == request.Code.Trim() || tc.Name == request.Name.Trim()));

        if (duplicateExists)
        {
            return BadRequest("A tax class with this code or name already exists.");
        }

        taxClass.Code = request.Code.Trim().ToUpper();
        taxClass.Name = request.Name.Trim();

        await _context.SaveChangesAsync();
        return Ok(taxClass);
    }

    [HttpDelete("classes/{id}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> DeleteTaxClass(long id)
    {
        var taxClass = await _context.TaxClasses.FindAsync(id);
        if (taxClass == null)
        {
            return NotFound();
        }

        var hasRates = await _context.TaxRates.AnyAsync(r => r.TaxClassId == id);
        if (hasRates)
        {
            return BadRequest("Cannot delete this tax class because it is used in one or more tax rate matrix rules.");
        }

        _context.TaxClasses.Remove(taxClass);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tax class successfully deleted." });
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

        if (request.CountryIds != null && request.CountryIds.Any())
        {
            var countriesToAssociate = await _context.Countries
                .Where(c => c.TenantId == UserTenantId && request.CountryIds.Contains(c.Id))
                .ToListAsync();
            foreach (var country in countriesToAssociate)
            {
                country.TaxZoneId = zone.Id;
            }
            await _context.SaveChangesAsync();
        }

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

        // Retrieve currently associated countries
        var currentCountries = await _context.Countries
            .Where(c => c.TenantId == UserTenantId && c.TaxZoneId == zone.Id)
            .ToListAsync();

        var targetCountryIds = request.CountryIds ?? new List<long>();

        // Remove from zone
        foreach (var c in currentCountries.Where(c => !targetCountryIds.Contains(c.Id)))
        {
            c.TaxZoneId = null;
        }

        // Add to zone
        var countriesToAdd = await _context.Countries
            .Where(c => c.TenantId == UserTenantId && targetCountryIds.Contains(c.Id) && c.TaxZoneId != zone.Id)
            .ToListAsync();
        foreach (var c in countriesToAdd)
        {
            c.TaxZoneId = zone.Id;
        }

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
            .Include(r => r.DeliveryZone)
            .Include(r => r.TaxClass)
            .OrderBy(r => r.BaseCountry.Name)
            .ThenBy(r => r.DeliveryCountry != null ? r.DeliveryCountry.Name : "")
            .ThenBy(r => r.DeliveryZone != null ? r.DeliveryZone.Name : "")
            .ToListAsync();
        return Ok(rates);
    }

    [HttpPost("rates")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateTaxRate([FromBody] CreateTaxRateRequest request)
    {
        if (request.DeliveryCountryId.HasValue == request.DeliveryZoneId.HasValue)
        {
            return BadRequest("Exactly one of DeliveryCountryId or DeliveryZoneId must be provided.");
        }

        var baseCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.BaseCountryId);
        if (!baseCountryExists) return BadRequest("Invalid BaseCountryId.");

        if (request.DeliveryCountryId.HasValue)
        {
            var deliveryCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.DeliveryCountryId.Value);
            if (!deliveryCountryExists) return BadRequest("Invalid DeliveryCountryId.");
        }

        if (request.DeliveryZoneId.HasValue)
        {
            var deliveryZoneExists = await _context.TaxZones.AnyAsync(z => z.Id == request.DeliveryZoneId.Value);
            if (!deliveryZoneExists) return BadRequest("Invalid DeliveryZoneId.");
        }

        var taxClassExists = await _context.TaxClasses.AnyAsync(tc => tc.Id == request.TaxClassId);
        if (!taxClassExists) return BadRequest("Invalid TaxClassId.");

        // Check uniqueness
        var duplicateExists = await _context.TaxRates.AnyAsync(r => 
            r.BaseCountryId == request.BaseCountryId && 
            r.DeliveryCountryId == request.DeliveryCountryId && 
            r.DeliveryZoneId == request.DeliveryZoneId &&
            r.TaxClassId == request.TaxClassId);

        if (duplicateExists)
        {
            return BadRequest("A tax rate rule already exists for this combination of base country, target destination, and tax class.");
        }

        var taxRate = new TaxRate
        {
            TenantId = UserTenantId,
            BaseCountryId = request.BaseCountryId,
            DeliveryCountryId = request.DeliveryCountryId,
            DeliveryZoneId = request.DeliveryZoneId,
            TaxClassId = request.TaxClassId,
            Rate = request.Rate
        };

        _context.TaxRates.Add(taxRate);
        await _context.SaveChangesAsync();

        var resolved = await _context.TaxRates
            .Include(r => r.BaseCountry)
            .Include(r => r.DeliveryCountry)
            .Include(r => r.DeliveryZone)
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

        if (request.DeliveryCountryId.HasValue == request.DeliveryZoneId.HasValue)
        {
            return BadRequest("Exactly one of DeliveryCountryId or DeliveryZoneId must be provided.");
        }

        var baseCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.BaseCountryId);
        if (!baseCountryExists) return BadRequest("Invalid BaseCountryId.");

        if (request.DeliveryCountryId.HasValue)
        {
            var deliveryCountryExists = await _context.Countries.AnyAsync(c => c.Id == request.DeliveryCountryId.Value);
            if (!deliveryCountryExists) return BadRequest("Invalid DeliveryCountryId.");
        }

        if (request.DeliveryZoneId.HasValue)
        {
            var deliveryZoneExists = await _context.TaxZones.AnyAsync(z => z.Id == request.DeliveryZoneId.Value);
            if (!deliveryZoneExists) return BadRequest("Invalid DeliveryZoneId.");
        }

        var taxClassExists = await _context.TaxClasses.AnyAsync(tc => tc.Id == request.TaxClassId);
        if (!taxClassExists) return BadRequest("Invalid TaxClassId.");

        // Check uniqueness if combination changed
        if (taxRate.BaseCountryId != request.BaseCountryId || 
            taxRate.DeliveryCountryId != request.DeliveryCountryId || 
            taxRate.DeliveryZoneId != request.DeliveryZoneId ||
            taxRate.TaxClassId != request.TaxClassId)
        {
            var duplicateExists = await _context.TaxRates.AnyAsync(r => 
                r.Id != id &&
                r.BaseCountryId == request.BaseCountryId && 
                r.DeliveryCountryId == request.DeliveryCountryId && 
                r.DeliveryZoneId == request.DeliveryZoneId &&
                r.TaxClassId == request.TaxClassId);

            if (duplicateExists)
            {
                return BadRequest("A tax rate rule already exists for this combination of base country, target destination, and tax class.");
            }
        }

        taxRate.BaseCountryId = request.BaseCountryId;
        taxRate.DeliveryCountryId = request.DeliveryCountryId;
        taxRate.DeliveryZoneId = request.DeliveryZoneId;
        taxRate.TaxClassId = request.TaxClassId;
        taxRate.Rate = request.Rate;

        await _context.SaveChangesAsync();

        var resolved = await _context.TaxRates
            .Include(r => r.BaseCountry)
            .Include(r => r.DeliveryCountry)
            .Include(r => r.DeliveryZone)
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
        public List<long>? CountryIds { get; set; }
    }

    public class CreateTaxRateRequest
    {
        public long BaseCountryId { get; set; }
        public long? DeliveryCountryId { get; set; }
        public long? DeliveryZoneId { get; set; }
        public long TaxClassId { get; set; }
        public decimal Rate { get; set; }
    }

    public class UpdateTaxRateRequest
    {
        public long BaseCountryId { get; set; }
        public long? DeliveryCountryId { get; set; }
        public long? DeliveryZoneId { get; set; }
        public long TaxClassId { get; set; }
        public decimal Rate { get; set; }
    }

    public class CreateTaxClassRequest
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
    }
}
