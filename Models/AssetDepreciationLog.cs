using System;

namespace Nimbus.DatabaseStructures.Models;

public class AssetDepreciationLog
{
    public long Id { get; set; }
public long FixedAssetId { get; set; }
    public FixedAsset FixedAsset { get; set; } = null!;

    public DateTime DepreciationDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; } // Depreciation amount posted

    public long? LedgerEntryId { get; set; } // Reference to posted General Ledger entry
}
