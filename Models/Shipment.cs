using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class Shipment
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public string ShipmentNumber { get; set; } = null!; // e.g. SH-2026-0001
    public string Carrier { get; set; } = null!;
    public string TrackingNumber { get; set; } = null!;
    public DateTime ShippedDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Shipped"; // Shipped, Delivered

    public ICollection<ShipmentLine> Lines { get; set; } = new List<ShipmentLine>();
}
