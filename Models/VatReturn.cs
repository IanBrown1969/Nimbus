using System;

namespace Nimbus.DatabaseStructures.Models;

public enum VatReturnStatus
{
    Draft,
    Submitted
}

public class VatReturn
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    // Standard HMRC UK 9-Boxes
    public decimal Box1 { get; set; } // VAT due on sales and other outputs
    public decimal Box2 { get; set; } // VAT due on acquisitions from EC Member States
    public decimal Box3 => Box1 + Box2; // Total VAT due
    public decimal Box4 { get; set; } // VAT reclaimed on purchases and other inputs
    public decimal Box5 => Math.Abs(Box3 - Box4); // Net VAT to pay or reclaim
    public decimal Box6 { get; set; } // Total value of sales and all other outputs excluding any VAT
    public decimal Box7 { get; set; } // Total value of purchases and all other inputs excluding any VAT
    public decimal Box8 { get; set; } // Total value of all supplies of goods and related costs from EC Member States
    public decimal Box9 { get; set; } // Total value of acquisitions of goods and related costs from EC Member States

    public VatReturnStatus Status { get; set; } = VatReturnStatus.Draft;
    public DateTime? SubmittedDate { get; set; }
    public long? SubmittedByUserId { get; set; }
}
