using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class PickList
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public string PickListNumber { get; set; } = null!; // e.g. PK-2026-0001
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public bool IsCompleted { get; set; }
    public DateTime? CompletedDate { get; set; }
    public long? CompletedByUserId { get; set; }
    public User? CompletedByUser { get; set; }

    public ICollection<PickListLine> Lines { get; set; } = new List<PickListLine>();
}
