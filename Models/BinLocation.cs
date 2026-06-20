using System;

namespace Nimbus.DatabaseStructures.Models;

public class BinLocation
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public long WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public string Code { get; set; } = null!; // e.g. "A-01-03" (Aisle A, Rack 1, Shelf 3)
    public string Description { get; set; } = null!;
}
