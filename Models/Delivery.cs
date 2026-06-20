using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class Delivery
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public string DeliveryNumber { get; set; } = null!; // e.g. GRN-2026-0001
    public DateTime DeliveryDate { get; set; } = DateTime.UtcNow;

    public long ReceivedByUserId { get; set; }
    public User ReceivedByUser { get; set; } = null!;

    public ICollection<DeliveryLine> Lines { get; set; } = new List<DeliveryLine>();
}
