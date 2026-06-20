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
[Route("api/finance/claims")]
public class ClaimsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public ClaimsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetClaims()
    {
        var claims = await _context.ExpenseClaims
            .Include(c => c.User)
            .Include(c => c.Lines)
            .ToListAsync();
        return Ok(claims);
    }

    [HttpPost]
    public async Task<IActionResult> SubmitClaim([FromBody] SubmitClaimRequest request)
    {
        var claim = new ExpenseClaim
        {
            UserId = UserId,
            Description = request.Description,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase,
            ReceiptUrl = request.ReceiptUrl,
            Status = ExpenseClaimStatus.Submitted
        };

        foreach (var reqLine in request.Lines)
        {
            claim.Lines.Add(new ExpenseClaimLine
            {
                Category = reqLine.Category,
                Description = reqLine.Description,
                NetAmount = reqLine.NetAmount,
                TaxAmount = reqLine.TaxAmount,
                TaxRate = reqLine.TaxRate
            });
        }

        _context.ExpenseClaims.Add(claim);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClaims), new { id = claim.Id }, claim);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "CompanyAdmin,Accounts,GlobalAdmin")]
    public async Task<IActionResult> ApproveClaim(long id)
    {
        var claim = await _context.ExpenseClaims
            .Include(c => c.Lines)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (claim == null) return NotFound();
        if (claim.Status != ExpenseClaimStatus.Submitted)
        {
            return BadRequest(new { message = "Claim has already been processed." });
        }

        claim.Status = ExpenseClaimStatus.Approved;
        claim.ApprovedByUserId = UserId;

        // General Ledger Posting in GBP base currency
        var totalNet = claim.Lines.Sum(l => l.NetAmount) / claim.ExchangeRateToBase;
        var totalTax = claim.Lines.Sum(l => l.TaxAmount) / claim.ExchangeRateToBase;
        var totalGross = totalNet + totalTax;

        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Expense Claim Approved: {claim.Description}",
            Reference = $"EXP-{claim.Id.ToString().Substring(0, 8)}",
            TenantId = UserTenantId
        };

        // 1. Debit Purchases/Expenses (Account "2000") with Net Amount
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "2000",
            Debit = totalNet,
            Credit = 0.0m,
            OriginalAmount = claim.Lines.Sum(l => l.NetAmount),
            OriginalCurrencyCode = claim.CurrencyCode,
            ExchangeRate = claim.ExchangeRateToBase
        });

        // 2. Debit VAT Liability (Account "5000") with reclaimed input tax (if any)
        if (totalTax > 0)
        {
            ledgerEntry.Lines.Add(new LedgerLine
            {
                AccountCode = "5000",
                Debit = totalTax,
                Credit = 0.0m,
                OriginalAmount = claim.Lines.Sum(l => l.TaxAmount),
                OriginalCurrencyCode = claim.CurrencyCode,
                ExchangeRate = claim.ExchangeRateToBase
            });
        }

        // 3. Credit Trade Creditors/Accruals (Account "4000") with Gross Amount
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4000",
            Debit = 0.0m,
            Credit = totalGross,
            OriginalAmount = claim.Lines.Sum(l => l.GrossAmount),
            OriginalCurrencyCode = claim.CurrencyCode,
            ExchangeRate = claim.ExchangeRateToBase
        });

        // Validate Double Entry balances
        var debitsSum = ledgerEntry.Lines.Sum(l => l.Debit);
        var creditsSum = ledgerEntry.Lines.Sum(l => l.Credit);
        if (Math.Abs(debitsSum - creditsSum) > 0.01m)
        {
            return BadRequest(new { message = "Double entry mismatch." });
        }

        _context.LedgerEntries.Add(ledgerEntry);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Expense claim approved and ledger transaction posted." });
    }

    public class SubmitClaimRequest
    {
        public string Description { get; set; } = null!;
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public string? ReceiptUrl { get; set; }
        public ClaimLineRequest[] Lines { get; set; } = null!;
    }

    public class ClaimLineRequest
    {
        public string Category { get; set; } = null!;
        public string Description { get; set; } = null!;
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TaxRate { get; set; }
    }
}
