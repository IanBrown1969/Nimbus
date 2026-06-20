using System;

namespace Nimbus.DatabaseStructures.Models;

public class StockCheckLine
{
    public long Id { get; set; }
public long StockCheckId { get; set; }
    public StockCheck StockCheck { get; set; } = null!;

    public long StockItemId { get; set; }
    public StockItem StockItem { get; set; } = null!;

    public long? BinLocationId { get; set; }
    public BinLocation? BinLocation { get; set; }

    public decimal ExpectedQuantity { get; set; } // Tracked in stocking units
    public decimal CountedQuantity { get; set; }  // Tracked in stocking units
    
    // Variance helper property
    public decimal Variance => CountedQuantity - ExpectedQuantity;
}
