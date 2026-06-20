using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum PurchaseOrderStatus
{
    Draft,
    Approved,
    Ordered,
    Received,
    Cancelled
}

public class PurchaseOrder
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string OrderNumber { get; set; } = null!; // e.g. PO-2026-0001
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    
    // Multi-currency tracking
    public string CurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRateToBase { get; set; } = 1.0m;

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;

    public long? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
}
