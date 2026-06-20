using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public class StockCheck
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public DateTime CheckDate { get; set; } = DateTime.UtcNow;
    
    public long CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public bool IsCompleted { get; set; } = false;
    public DateTime? CompletedDate { get; set; }
    
    public string? Notes { get; set; }

    public ICollection<StockCheckLine> Lines { get; set; } = new List<StockCheckLine>();
}
