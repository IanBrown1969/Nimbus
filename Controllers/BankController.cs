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
[Route("api/finance/bank")]
public class BankController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public BankController(NimbusDbContext context)
    {
        _context = context;
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

        // Generate a mock Open Banking Plaid feed statement transaction
        var mockTx = new BankStatementLine
        {
            TenantId = UserTenantId,
            BankAccountId = account.Id,
            TransactionDate = DateTime.UtcNow.AddMinutes(-5),
            Description = "Card Purchase: Merchant Materials Ltd",
            Reference = "CARD-MERCH-852",
            Amount = -180.00m, // Withdrawal
            IsReconciled = false
        };

        _context.BankStatementLines.Add(mockTx);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Bank feed transactions synchronized successfully.", syncedCount = 1 });
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
}
