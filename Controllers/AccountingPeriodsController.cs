using System;
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
[Route("api/finance/periods")]
public class AccountingPeriodsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly IPeriodService _periodService;

    public AccountingPeriodsController(NimbusDbContext context, IPeriodService periodService)
    {
        _context = context;
        _periodService = periodService;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetPeriods()
    {
        var periods = await _context.AccountingPeriods
            .OrderBy(p => p.StartDate)
            .ToListAsync();
        return Ok(periods);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreatePeriod([FromBody] CreatePeriodRequest request)
    {
        if (request.StartDate >= request.EndDate)
        {
            return BadRequest(new { message = "Start date must be before end date." });
        }

        try
        {
            var period = await _periodService.CreatePeriodAsync(request.Name, request.StartDate, request.EndDate);
            return CreatedAtAction(nameof(GetPeriods), new { id = period.Id }, period);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/lock")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> LockPeriod(long id, [FromBody] LockPeriodRequest request)
    {
        try
        {
            var period = await _periodService.SetPeriodLockAsync(id, request.IsLocked);
            return Ok(new { message = $"Accounting period {(period.IsLocked ? "locked" : "unlocked")} successfully.", period });
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public class CreatePeriodRequest
    {
        public string Name { get; set; } = null!;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class LockPeriodRequest
    {
        public bool IsLocked { get; set; }
    }
}
