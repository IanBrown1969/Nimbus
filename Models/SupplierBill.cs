using System;

namespace Nimbus.DatabaseStructures.Models;

public enum SupplierBillStatus
{
    Unpaid = 0,
    Paid = 1
}

public class SupplierBill
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string BillNumber { get; set; } = null!; // Vendor bill ref
    public long? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public long SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);

    public decimal TotalNet { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalGross => TotalNet + TotalTax;

    public SupplierBillStatus Status { get; set; } = SupplierBillStatus.Unpaid;
}
