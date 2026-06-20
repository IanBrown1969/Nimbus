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
[Route("api/finance/assets")]
public class AssetsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public AssetsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetAssets()
    {
        var assets = await _context.FixedAssets
            .Include(a => a.DepreciationLogs)
            .ToListAsync();
        return Ok(assets);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetRequest request)
    {
        var asset = new FixedAsset
        {
            AssetCode = request.AssetCode,
            Name = request.Name,
            Description = request.Description,
            PurchaseCost = request.PurchaseCost,
            PurchaseDate = request.PurchaseDate,
            Method = request.Method,
            DepreciationRate = request.DepreciationRate,
            CurrentBookValue = request.PurchaseCost, // initially cost
            IsDisposed = false
        };

        _context.FixedAssets.Add(asset);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssets), new { id = asset.Id }, asset);
    }

    [HttpPost("{id}/depreciate")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> DepreciateAsset(long id)
    {
        var asset = await _context.FixedAssets.FindAsync(id);
        if (asset == null) return NotFound();
        if (asset.IsDisposed || asset.CurrentBookValue <= 0.0m)
        {
            return BadRequest(new { message = "Asset cannot be depreciated." });
        }

        // Calculate 1 month of depreciation
        // Rate is annual (e.g. 20% = 0.20), so monthly rate = Rate / 12
        decimal depreciationAmount = 0.0m;
        var monthlyRate = asset.DepreciationRate / 12.0m;

        if (asset.Method == DepreciationMethod.StraightLine)
        {
            depreciationAmount = asset.PurchaseCost * monthlyRate;
        }
        else // ReducingBalance
        {
            depreciationAmount = asset.CurrentBookValue * monthlyRate;
        }

        // Ensure we don't depreciate below zero book value
        if (depreciationAmount > asset.CurrentBookValue)
        {
            depreciationAmount = asset.CurrentBookValue;
        }

        if (depreciationAmount <= 0.0m)
        {
            return BadRequest(new { message = "Asset has already fully depreciated." });
        }

        // Apply changes
        asset.CurrentBookValue -= depreciationAmount;
        asset.LastDepreciationDate = DateTime.UtcNow;

        // Post balanced double-entry depreciation journals to General Ledger
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Monthly Depreciation posting for Asset: {asset.Name}",
            Reference = asset.AssetCode,
            TenantId = UserTenantId
        };

        // 1. Debit Depreciation Expense (Account "2500" - Expense)
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "2500", // Depreciation Expense
            Debit = depreciationAmount,
            Credit = 0.0m,
            OriginalAmount = depreciationAmount,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 2. Credit Accumulated Depreciation (Account "1500" - Asset contra-account)
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "1500", // Contra-asset
            Debit = 0.0m,
            Credit = depreciationAmount,
            OriginalAmount = depreciationAmount,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // Validate double entry balance
        var dSum = ledgerEntry.Lines.Sum(l => l.Debit);
        var cSum = ledgerEntry.Lines.Sum(l => l.Credit);
        if (Math.Abs(dSum - cSum) > 0.01m)
        {
            return BadRequest(new { message = "Double entry mismatch." });
        }

        _context.LedgerEntries.Add(ledgerEntry);

        // Record log
        var log = new AssetDepreciationLog
        {
            FixedAssetId = asset.Id,
            DepreciationDate = DateTime.UtcNow,
            Amount = depreciationAmount,
            LedgerEntryId = ledgerEntry.Id
        };
        _context.AssetDepreciationLogs.Add(log);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Monthly depreciation processed and ledger journal posted successfully.",
            depreciatedAmount = depreciationAmount,
            remainingBookValue = asset.CurrentBookValue
        });
    }

    public class CreateAssetRequest
    {
        public string AssetCode { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public decimal PurchaseCost { get; set; }
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
        public DepreciationMethod Method { get; set; }
        public decimal DepreciationRate { get; set; }
    }
}
