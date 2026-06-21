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
[Route("api/finance/grants")]
public class GrantsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public GrantsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetGrants()
    {
        var grants = await _context.GrantPrograms
            .OrderByDescending(gp => gp.StartDate)
            .ToListAsync();
        return Ok(grants);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateGrant([FromBody] CreateGrantRequest request)
    {
        if (request.StartDate >= request.EndDate)
        {
            return BadRequest(new { message = "Start date must be before end date." });
        }

        var grant = new GrantProgram
        {
            TenantId = UserTenantId,
            Name = request.Name,
            Donor = request.Donor,
            TotalBudget = request.TotalBudget,
            AllocatedBudget = request.AllocatedBudget,
            Spent = request.Spent,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status ?? "active",
            ComplianceScore = request.ComplianceScore
        };

        _context.GrantPrograms.Add(grant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGrants), new { id = grant.Id }, grant);
    }

    public class CreateGrantRequest
    {
        public string Name { get; set; } = null!;
        public string Donor { get; set; } = null!;
        public decimal TotalBudget { get; set; }
        public decimal AllocatedBudget { get; set; }
        public decimal Spent { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Status { get; set; }
        public int ComplianceScore { get; set; } = 100;
    }
}
