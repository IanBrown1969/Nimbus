using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using Nimbus.AdminApi.Attributes;
using Nimbus.AdminApi.Services;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance/bank")]
[RequirePlugin("BNK")]
public class BankController : ApiControllerBase
{
    private readonly NimbusDbContext _context;
    private readonly PlaidService _plaidService;

    public BankController(NimbusDbContext context, PlaidService plaidService)
    {
        _context = context;
        _plaidService = plaidService;
    }

    [HttpGet("accounts")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetBankAccounts()
    {
        var accounts = await _context.BankAccounts.ToListAsync();
        return Ok(accounts);
    }

    [HttpGet("feed/{accountId}")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetBankFeed(long accountId)
    {
        var feed = await _context.BankStatementLines
            .Where(b => b.BankAccountId == accountId)
            .OrderByDescending(b => b.TransactionDate)
            .ToListAsync();
        return Ok(feed);
    }

    [HttpPost("feed/sync")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> SyncBankFeed([FromBody] SyncFeedRequest request)
    {
        var account = await _context.BankAccounts.FindAsync(request.BankAccountId);
        if (account == null) return NotFound();

        account.IsFeedConnected = true;
        account.LastSyncedAt = DateTime.UtcNow;

        // Fetch transactions from the last 30 days
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        var txs = await _plaidService.FetchStatementLinesAsync(UserTenantId, account.Id, account.CurrencyCode, fromDate, toDate);

        // Deduplicate: check if a statement line with same reference already exists
        var existingRefs = await _context.BankStatementLines
            .Where(b => b.BankAccountId == account.Id)
            .Select(b => b.Reference)
            .ToListAsync();

        var newTxs = txs.Where(tx => !existingRefs.Contains(tx.Reference)).ToList();

        if (newTxs.Any())
        {
            _context.BankStatementLines.AddRange(newTxs);
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Bank feed transactions synchronized successfully.", syncedCount = newTxs.Count });
    }

    [HttpPost("feed/import")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> BulkImport([FromBody] BulkImportRequest request)
    {
        var account = await _context.BankAccounts.FindAsync(request.BankAccountId);
        if (account == null) return NotFound("Bank account not found.");

        var newLines = new List<BankStatementLine>();
        foreach (var tx in request.Transactions)
        {
            newLines.Add(new BankStatementLine
            {
                TenantId = UserTenantId,
                BankAccountId = account.Id,
                TransactionDate = tx.TransactionDate,
                Description = tx.Description,
                Reference = tx.Reference,
                Amount = tx.Amount,
                IsReconciled = false
            });
        }

        _context.BankStatementLines.AddRange(newLines);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{newLines.Count} transactions imported successfully." });
    }

    [HttpPost("reconcile")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ReconcileTransaction([FromBody] ReconcileRequest request)
    {
        var line = await _context.BankStatementLines
            .Include(l => l.BankAccount)
            .FirstOrDefaultAsync(l => l.Id == request.BankStatementLineId);

        if (line == null) return NotFound("Bank statement line not found.");
        if (line.IsReconciled)
        {
            return BadRequest(new { message = "Transaction is already reconciled." });
        }

        // Fetch corresponding Ledger line to match (checks account code)
        var ledgerLine = await _context.LedgerLines
            .Include(ll => ll.LedgerEntry)
            .FirstOrDefaultAsync(ll => ll.Id == request.LedgerLineId);

        if (ledgerLine == null) return NotFound("Ledger posting line not found.");

        // Reconcile and match
        line.IsReconciled = true;
        line.ReconciledLedgerLineId = ledgerLine.Id;

        // Adjust running bank balance based on transaction value
        line.BankAccount.CurrentBalance += line.Amount;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Reconciliation matched successfully. Bank ledger balance updated.",
            reconciledBalance = line.BankAccount.CurrentBalance
        });
    }

    public class SyncFeedRequest
    {
        public long BankAccountId { get; set; }
    }

    public class ReconcileRequest
    {
        public long BankStatementLineId { get; set; }
        public long LedgerLineId { get; set; }
    }

    public class BulkImportRequest
    {
        public long BankAccountId { get; set; }
        public List<ImportedTransactionLine> Transactions { get; set; } = new();
    }

    public class ImportedTransactionLine
    {
        public DateTime TransactionDate { get; set; }
        public string Description { get; set; } = null!;
        public string Reference { get; set; } = "";
        public decimal Amount { get; set; }
    }
}
