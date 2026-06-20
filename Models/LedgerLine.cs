using System;

namespace Nimbus.DatabaseStructures.Models;

public class LedgerLine
{
    public long Id { get; set; }
public long LedgerEntryId { get; set; }
    public LedgerEntry LedgerEntry { get; set; } = null!;

    // HMRC/Standard chart of accounts code (e.g. "1000" for Sales, "5000" for VAT)
    public string AccountCode { get; set; } = null!;

    // Posted amounts in base reporting currency (GBP)
    public decimal Debit { get; set; }  // Debits increase assets or expenses
    public decimal Credit { get; set; } // Credits increase liabilities, equity, or revenue

    // Track original transaction details for foreign currency audits
    public decimal OriginalAmount { get; set; } // original amount in foreign currency
    public string OriginalCurrencyCode { get; set; } = "GBP";
    public decimal ExchangeRate { get; set; } = 1.0m;

    // SAP B1 Style Fixed dimensions
    public long? DepartmentDimensionId { get; set; }
    public AccountingDimension? DepartmentDimension { get; set; }

    public long? ProjectDimensionId { get; set; }
    public AccountingDimension? ProjectDimension { get; set; }
}
