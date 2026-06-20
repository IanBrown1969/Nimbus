using System;

namespace Nimbus.DatabaseStructures.Models;

public class AuditLog
{
    public long Id { get; set; }
public long TenantId { get; set; }

    public string Username { get; set; } = null!;
    public string Action { get; set; } = null!; // "Added", "Modified", "Deleted"
    public string EntityName { get; set; } = null!; // e.g. "Invoice", "StockItem"
    public string EntityId { get; set; } = null!; // The Guid ID of the entity
    public string ChangeDetails { get; set; } = null!; // Text summarizing field level deltas
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
