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
[Route("api/finance/accounts")]
public class AccountsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public AccountsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetAccounts()
    {
        var accounts = await _context.LedgerAccounts
            .OrderBy(a => a.AccountCode)
            .ToListAsync();
        return Ok(accounts);
    }

    [HttpPost]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountCode) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Account Code and Name are required." });
        }

        var exists = await _context.LedgerAccounts
            .AnyAsync(a => a.AccountCode == request.AccountCode);
        if (exists)
        {
            return BadRequest(new { message = $"Ledger account with code '{request.AccountCode}' already exists." });
        }

        var account = new LedgerAccount
        {
            AccountCode = request.AccountCode,
            Name = request.Name,
            Type = request.Type,
            Description = request.Description
        };

        _context.LedgerAccounts.Add(account);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAccounts), new { id = account.Id }, account);
    }

    public class CreateAccountRequest
    {
        public string AccountCode { get; set; } = null!;
        public string Name { get; set; } = null!;
        public LedgerAccountType Type { get; set; }
        public string? Description { get; set; }
    }
}
