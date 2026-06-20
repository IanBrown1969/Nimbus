using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum SalesOrderStatus
{
    Draft = 0,
    Approved = 1,
    Shipped = 2,
    Invoiced = 3,
    Cancelled = 4
}

public class SalesOrder
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string OrderNumber { get; set; } = null!; // e.g. SO-2026-0001
    public string CustomerName { get; set; } = null!;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    public string CurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRateToBase { get; set; } = 1.0m;

    public decimal TotalNet { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalGross => TotalNet + TotalTax;

    public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Draft;

    public ICollection<SalesOrderLine> Lines { get; set; } = new List<SalesOrderLine>();
}
