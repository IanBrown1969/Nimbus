using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum DepreciationMethod
{
    StraightLine,
    ReducingBalance
}

public class FixedAsset
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string AssetCode { get; set; } = null!; // e.g. AST-0001
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;

    public decimal PurchaseCost { get; set; } // GBP Value
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    public DepreciationMethod Method { get; set; } = DepreciationMethod.StraightLine;
    public decimal DepreciationRate { get; set; } // e.g. 0.10 for 10% annual depreciation
    
    public decimal CurrentBookValue { get; set; }
    public DateTime? LastDepreciationDate { get; set; }
    public bool IsDisposed { get; set; } = false;

    public ICollection<AssetDepreciationLog> DepreciationLogs { get; set; } = new List<AssetDepreciationLog>();
}
