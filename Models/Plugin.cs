using System;

namespace Nimbus.DatabaseStructures.Models;

public class Plugin
{
    public long Id { get; set; }
    public string Code { get; set; } = null!; // "PIM", "WMS", "SUP"
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal MonthlyPrice { get; set; }
    public bool IsActive { get; set; } = true;
}
