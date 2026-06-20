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
[Route("api/finance/credit-notes")]
public class CreditNotesController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public CreditNotesController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetCreditNotes()
    {
        var notes = await _context.CreditNotes
            .Include(c => c.Invoice)
            .Include(c => c.Lines)
            .ThenInclude(l => l.StockItem)
            .OrderByDescending(c => c.Date)
            .ToListAsync();
        return Ok(notes);
    }

    [HttpPost]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateCreditNote([FromBody] CreateCreditNoteRequest request)
    {
        var creditNote = new CreditNote
        {
            CreditNoteNumber = request.CreditNoteNumber,
            InvoiceId = request.InvoiceId,
            CustomerName = request.CustomerName,
            Date = DateTime.UtcNow,
            Status = "Issued"
        };

        decimal totalNet = 0.0m;
        decimal totalTax = 0.0m;

        foreach (var reqLine in request.Lines)
        {
            var line = new CreditNoteLine
            {
                CreditNoteId = creditNote.Id,
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                TaxRate = reqLine.TaxRate
            };

            totalNet += line.NetAmount;
            totalTax += line.TaxAmount;

            creditNote.Lines.Add(line);
        }

        creditNote.TotalNet = totalNet;
        creditNote.TotalTax = totalTax;

        _context.CreditNotes.Add(creditNote);

        // General Ledger Posting: Reverse Sales
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = creditNote.Date,
            Description = $"Credit Note reversal: {creditNote.CustomerName}",
            Reference = creditNote.CreditNoteNumber,
            TenantId = UserTenantId
        };

        // 1. Debit Sales Revenue (Account "1000") by Net Amount to reverse income
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "1000",
            Debit = totalNet,
            Credit = 0.0m,
            OriginalAmount = totalNet,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 2. Debit VAT Liability (Account "5000") by VAT Tax Amount to reverse tax liability
        if (totalTax > 0)
        {
            ledgerEntry.Lines.Add(new LedgerLine
            {
                AccountCode = "5000",
                Debit = totalTax,
                Credit = 0.0m,
                OriginalAmount = totalTax,
                OriginalCurrencyCode = "GBP",
                ExchangeRate = 1.0m
            });
        }

        // 3. Credit Debtors Control (Account "3000") by Gross Amount to reduce outstanding customer debt
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "3000",
            Debit = 0.0m,
            Credit = totalNet + totalTax,
            OriginalAmount = totalNet + totalTax,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // Validate double entry balances
        var totalDebits = ledgerEntry.Lines.Sum(l => l.Debit);
        var totalCredits = ledgerEntry.Lines.Sum(l => l.Credit);
        if (Math.Abs(totalDebits - totalCredits) > 0.01m)
        {
            return BadRequest(new { message = "Ledger double-entry failed to balance." });
        }

        _context.LedgerEntries.Add(ledgerEntry);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCreditNotes), new { id = creditNote.Id }, creditNote);
    }

    public class CreateCreditNoteRequest
    {
        public string CreditNoteNumber { get; set; } = null!;
        public long? InvoiceId { get; set; }
        public string CustomerName { get; set; } = null!;
        public CreditNoteLineRequest[] Lines { get; set; } = null!;
    }

    public class CreditNoteLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
    }
}
