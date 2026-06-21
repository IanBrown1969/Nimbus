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

    [HttpPost("{id}/close")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ClosePeriod(long id, [FromBody] ClosePeriodRequest request)
    {
        var period = await _context.AccountingPeriods.FindAsync(id);
        if (period == null) return NotFound();

        period.ClosedBy = User.Identity?.Name ?? "Company Administrator";
        period.ClosedAt = DateTime.UtcNow;
        period.CloseNotes = request.Notes;
        period.IsLocked = true; // Closing a period locks it

        await _context.SaveChangesAsync();
        return Ok(new { message = "Accounting period closed successfully.", period });
    }

    [HttpPost("setup")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> SetupPeriods([FromBody] SetupPeriodsRequest request)
    {
        if (request.YearStartDate >= request.YearEndDate)
        {
            return BadRequest(new { message = "Financial year start date must be before end date." });
        }
        if (request.PeriodCount <= 0 || request.PeriodCount > 24)
        {
            return BadRequest(new { message = "Period count must be between 1 and 24." });
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var start = request.YearStartDate.Date;
            var end = request.YearEndDate.Date;

            var existing = await _context.AccountingPeriods
                .Where(p => (p.StartDate >= start && p.StartDate <= end) || (p.EndDate >= start && p.EndDate <= end))
                .ToListAsync();

            if (existing.Any(p => p.IsLocked))
            {
                return BadRequest(new { message = "Cannot overwrite accounting periods because some periods in this date range are locked." });
            }

            _context.AccountingPeriods.RemoveRange(existing);

            var newPeriods = new List<AccountingPeriod>();
            var count = request.PeriodCount;

            if (count == 12 && start.Day == 1)
            {
                for (int i = 0; i < 12; i++)
                {
                    var pStart = start.AddMonths(i);
                    var pEnd = (i == 11) ? end : pStart.AddMonths(1).AddDays(-1);
                    
                    if (pEnd > end) pEnd = end;

                    newPeriods.Add(new AccountingPeriod
                    {
                        TenantId = UserTenantId,
                        Name = $"{pStart:yyyy-MM} Period {i + 1}",
                        StartDate = pStart,
                        EndDate = pEnd,
                        IsLocked = false
                    });
                }
            }
            else
            {
                var totalDays = (end - start).Days + 1;
                var daysPerPeriod = (double)totalDays / count;
                
                for (int i = 0; i < count; i++)
                {
                    var pStart = start.AddDays((int)Math.Round(i * daysPerPeriod));
                    var pEnd = (i == count - 1) ? end : start.AddDays((int)Math.Round((i + 1) * daysPerPeriod)) - TimeSpan.FromDays(1);
                    
                    if (pEnd > end) pEnd = end;

                    newPeriods.Add(new AccountingPeriod
                    {
                        TenantId = UserTenantId,
                        Name = $"Period {i + 1} ({pStart:yyyy-MM-dd} to {pEnd:yyyy-MM-dd})",
                        StartDate = pStart,
                        EndDate = pEnd,
                        IsLocked = false
                    });
                }
            }

            _context.AccountingPeriods.AddRange(newPeriods);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Accounting periods set up successfully.", periods = newPeriods });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { message = ex.Message });
        }
    }

    public class SetupPeriodsRequest
    {
        public DateTime YearStartDate { get; set; }
        public DateTime YearEndDate { get; set; }
        public int PeriodCount { get; set; } = 12;
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

    public class ClosePeriodRequest
    {
        public string? Notes { get; set; }
    }
}
