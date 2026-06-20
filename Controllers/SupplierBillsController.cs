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
[Route("api/finance/bills")]
public class SupplierBillsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public SupplierBillsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetBills()
    {
        var bills = await _context.SupplierBills
            .Include(b => b.Supplier)
            .OrderByDescending(b => b.Date)
            .ToListAsync();
        return Ok(bills);
    }

    [HttpPost]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateBill([FromBody] CreateBillRequest request)
    {
        var supplier = await _context.Suppliers.FindAsync(request.SupplierId);
        if (supplier == null) return NotFound(new { message = "Supplier not found." });

        var bill = new SupplierBill
        {
            BillNumber = request.BillNumber,
            PurchaseOrderId = request.PurchaseOrderId,
            SupplierId = request.SupplierId,
            Date = request.Date,
            DueDate = request.DueDate,
            TotalNet = request.TotalNet,
            TotalTax = request.TotalTax,
            Status = SupplierBillStatus.Unpaid
        };

        _context.SupplierBills.Add(bill);

        // General Ledger Posting: Cost of Goods / Purchases Liability
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = bill.Date,
            Description = $"Supplier Bill: {supplier.Name}",
            Reference = bill.BillNumber,
            TenantId = UserTenantId
        };

        // 1. Debit Purchases/Expenses (Account "2000") by Net Amount
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "2000",
            Debit = bill.TotalNet,
            Credit = 0.0m,
            OriginalAmount = bill.TotalNet,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 2. Debit VAT Liability (Account "5000") by VAT Tax Amount (reclaimed input tax)
        if (bill.TotalTax > 0)
        {
            ledgerEntry.Lines.Add(new LedgerLine
            {
                AccountCode = "5000",
                Debit = bill.TotalTax,
                Credit = 0.0m,
                OriginalAmount = bill.TotalTax,
                OriginalCurrencyCode = "GBP",
                ExchangeRate = 1.0m
            });
        }

        // 3. Credit Trade Creditors (Account "4000") by Gross Amount (outstanding liability)
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4000",
            Debit = 0.0m,
            Credit = bill.TotalGross,
            OriginalAmount = bill.TotalGross,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // Validate double entry
        var totalDebits = ledgerEntry.Lines.Sum(l => l.Debit);
        var totalCredits = ledgerEntry.Lines.Sum(l => l.Credit);
        if (Math.Abs(totalDebits - totalCredits) > 0.01m)
        {
            return BadRequest(new { message = "Ledger double-entry failed to balance." });
        }

        _context.LedgerEntries.Add(ledgerEntry);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBills), new { id = bill.Id }, bill);
    }

    [HttpPost("{id}/pay")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> PayBill(long id, [FromBody] PayBillActionRequest request)
    {
        var bill = await _context.SupplierBills
            .Include(b => b.Supplier)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bill == null) return NotFound(new { message = "Bill not found." });
        if (bill.Status == SupplierBillStatus.Paid)
        {
            return BadRequest(new { message = "Bill has already been paid." });
        }

        bill.Status = SupplierBillStatus.Paid;

        // General Ledger Payment posting
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Paid vendor bill: {bill.BillNumber}",
            Reference = bill.BillNumber,
            TenantId = UserTenantId
        };

        // 1. Debit Trade Creditors (Account "4000") by Gross Amount to clear vendor liability
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4000",
            Debit = bill.TotalGross,
            Credit = 0.0m,
            OriginalAmount = bill.TotalGross,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 2. Credit Cash / Bank Account (Account "6000") by Gross Amount to deduct cash balance
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "6000",
            Debit = 0.0m,
            Credit = bill.TotalGross,
            OriginalAmount = bill.TotalGross,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        _context.LedgerEntries.Add(ledgerEntry);

        // Deduct from bank account balance
        var bank = await _context.BankAccounts.FirstOrDefaultAsync(b => b.Id == request.BankAccountId);
        if (bank != null)
        {
            bank.CurrentBalance -= bill.TotalGross;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Supplier bill payment posted and bank balance updated." });
    }

    public class CreateBillRequest
    {
        public string BillNumber { get; set; } = null!;
        public long? PurchaseOrderId { get; set; }
        public long SupplierId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
        public decimal TotalNet { get; set; }
        public decimal TotalTax { get; set; }
    }

    public class PayBillActionRequest
    {
        public long BankAccountId { get; set; }
    }
}
