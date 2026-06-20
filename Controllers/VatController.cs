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
[Route("api/finance/vat")]
public class VatController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public VatController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet("returns")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetVatReturns()
    {
        var returns = await _context.VatReturns
            .OrderByDescending(r => r.PeriodEnd)
            .ToListAsync();
        return Ok(returns);
    }

    [HttpGet("calculate")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CalculateVatReturn([FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        // 1. Fetch all general ledger lines in this range
        var ledgerLines = await _context.LedgerLines
            .Include(l => l.LedgerEntry)
            .Where(l => l.LedgerEntry.EntryDate >= start && l.LedgerEntry.EntryDate <= end)
            .ToListAsync();

        // 2. Compute HMRC boxes
        // Box 1: VAT due on Sales (Credits on VAT Liability Account "5000" from Invoices)
        var box1 = ledgerLines
            .Where(l => l.AccountCode == "5000" && l.Credit > 0 && l.LedgerEntry.Description.Contains("Invoice"))
            .Sum(l => l.Credit);

        // Box 2: VAT acquisitions from EU (mocked as 0 for initial simplicity)
        decimal box2 = 0.0m;

        // Box 4: VAT reclaimed on purchases/expenses (Debits on VAT Account "5000" from Claims/PO Bills)
        var box4 = ledgerLines
            .Where(l => l.AccountCode == "5000" && l.Debit > 0)
            .Sum(l => l.Debit);

        // Box 6: Total Net Sales (Credits on Revenue Account "1000")
        var box6 = ledgerLines
            .Where(l => l.AccountCode == "1000" && l.Credit > 0)
            .Sum(l => l.Credit);

        // Box 7: Total Net Purchases (Debits on Purchases Account "2000")
        var box7 = ledgerLines
            .Where(l => l.AccountCode == "2000" && l.Debit > 0)
            .Sum(l => l.Debit);

        var result = new
        {
            PeriodStart = start,
            PeriodEnd = end,
            Box1 = box1,
            Box2 = box2,
            Box3 = box1 + box2,
            Box4 = box4,
            Box5 = Math.Abs((box1 + box2) - box4),
            Box6 = box6,
            Box7 = box7,
            Box8 = 0.0m,
            Box9 = 0.0m
        };

        return Ok(result);
    }

    [HttpPost("returns")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> FileVatReturn([FromBody] FileVatReturnRequest request)
    {
        var vatReturn = new VatReturn
        {
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            Box1 = request.Box1,
            Box2 = request.Box2,
            Box4 = request.Box4,
            Box6 = request.Box6,
            Box7 = request.Box7,
            Box8 = request.Box8,
            Box9 = request.Box9,
            Status = VatReturnStatus.Submitted,
            SubmittedDate = DateTime.UtcNow,
            SubmittedByUserId = UserId
        };

        _context.VatReturns.Add(vatReturn);
        await _context.SaveChangesAsync();

        return Ok(new { message = "HMRC VAT Return filed and finalized successfully.", returnId = vatReturn.Id });
    }

    public class FileVatReturnRequest
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal Box1 { get; set; }
        public decimal Box2 { get; set; }
        public decimal Box4 { get; set; }
        public decimal Box6 { get; set; }
        public decimal Box7 { get; set; }
        public decimal Box8 { get; set; }
        public decimal Box9 { get; set; }
    }
}
