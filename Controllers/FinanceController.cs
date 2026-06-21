using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.AdminApi.Attributes;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/finance")]
public class FinanceController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public FinanceController(NimbusDbContext context)
    {
        _context = context;
    }

    // 0.5. Countries
    [HttpGet("countries")]
    [Authorize(Roles = "Warehouse,Sales,Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetCountries()
    {
        var countries = await _context.Countries.ToListAsync();
        return Ok(countries);
    }

    // 1. Invoices
    [HttpGet("invoices")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetInvoices()
    {
        var invoices = await _context.Invoices
            .Include(i => i.Lines)
            .ThenInclude(l => l.StockItem)
            .ToListAsync();
        return Ok(invoices);
    }

    [HttpPost("invoices")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        var exchangeRate = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase;

        var invoice = new Invoice
        {
            InvoiceNumber = request.InvoiceNumber,
            CustomerName = request.CustomerName,
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = exchangeRate,
            Status = InvoiceStatus.Issued
        };

        decimal totalNet = 0.0m;
        decimal totalTax = 0.0m;

        // Check if VAT plugin is active
        var isVatPluginActive = await _context.TenantPlugins.AnyAsync(tp => tp.Plugin.Code == "VAT" && tp.IsActive);

        foreach (var reqLine in request.Lines)
        {
            var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
            if (stockItem == null)
            {
                return BadRequest(new { message = $"StockItem {reqLine.StockItemId} not found." });
            }

            decimal resolvedTaxRate = reqLine.TaxRate;
            if (isVatPluginActive)
            {
                long? countryId = null;
                var customer = await _context.Customers
                    .Include(c => c.Country)
                    .FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
                
                if (customer != null && customer.CountryId.HasValue)
                {
                    countryId = customer.CountryId.Value;
                }
                else
                {
                    var contact = await _context.Contacts
                        .Include(c => c.Country)
                        .FirstOrDefaultAsync(c => c.Name == request.CustomerName || c.CompanyName == request.CustomerName);
                    
                    if (contact != null && contact.CountryId.HasValue)
                    {
                        countryId = contact.CountryId.Value;
                    }
                }

                if (countryId.HasValue && stockItem.TaxClassId.HasValue)
                {
                    var taxRateRule = await _context.TaxRates
                        .FirstOrDefaultAsync(r => r.CountryId == countryId.Value && r.TaxClassId == stockItem.TaxClassId.Value);
                    if (taxRateRule != null)
                    {
                        resolvedTaxRate = taxRateRule.Rate;
                    }
                }
            }

            var line = new InvoiceLine
            {
                InvoiceId = invoice.Id,
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                TaxRate = resolvedTaxRate
            };

            totalNet += line.NetAmount;
            totalTax += line.TaxAmount;

            invoice.Lines.Add(line);
        }

        invoice.TotalNet = totalNet;
        invoice.TotalTax = totalTax;

        _context.Invoices.Add(invoice);

        // Generate Balanced Double-Entry General Ledger journal item in GBP Base Currency
        var baseNet = totalNet / exchangeRate;
        var baseTax = totalTax / exchangeRate;
        var baseGross = baseNet + baseTax;

        var ledgerEntry = new LedgerEntry
        {
            EntryDate = invoice.InvoiceDate,
            Description = $"Sales Invoice posting: {invoice.CustomerName}",
            Reference = invoice.InvoiceNumber,
            TenantId = UserTenantId
        };

        // Debtors Control Account (Account "3000") is DEBITED by Gross Amount
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "3000",
            Debit = baseGross,
            Credit = 0.0m,
            OriginalAmount = totalNet + totalTax,
            OriginalCurrencyCode = invoice.CurrencyCode,
            ExchangeRate = exchangeRate
        });

        // Sales Revenue Account (Account "1000") is CREDITED by Net Amount
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "1000",
            Debit = 0.0m,
            Credit = baseNet,
            OriginalAmount = totalNet,
            OriginalCurrencyCode = invoice.CurrencyCode,
            ExchangeRate = exchangeRate
        });

        // VAT Liability Account (Account "5000") is CREDITED by VAT Tax Amount
        if (baseTax > 0)
        {
            ledgerEntry.Lines.Add(new LedgerLine
            {
                AccountCode = "5000",
                Debit = 0.0m,
                Credit = baseTax,
                OriginalAmount = totalTax,
                OriginalCurrencyCode = invoice.CurrencyCode,
                ExchangeRate = exchangeRate
            });
        }

        // Validate Double Entry balances
        var totalDebits = ledgerEntry.Lines.Sum(l => l.Debit);
        var totalCredits = ledgerEntry.Lines.Sum(l => l.Credit);

        if (Math.Abs(totalDebits - totalCredits) > 0.01m)
        {
            return BadRequest(new { message = "Ledger double-entry failed to balance.", debits = totalDebits, credits = totalCredits });
        }

        _context.LedgerEntries.Add(ledgerEntry);

        // Subtract stock quantities
        foreach (var line in invoice.Lines)
        {
            var qtyInStockUnits = line.Quantity / line.StockItem.ConversionRatio;

            var inventory = await _context.StockInventories
                .FirstOrDefaultAsync(i => i.StockItemId == line.StockItemId);

            if (inventory != null)
            {
                inventory.Quantity -= qtyInStockUnits;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Invoice posted and Ledger records written successfully.", invoiceId = invoice.Id });
    }

    [HttpPost("invoices/{id}/pay")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> PayInvoice(long id, [FromBody] PayInvoiceRequest request)
    {
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null) return NotFound();
        if (invoice.Status == InvoiceStatus.Paid)
        {
            return BadRequest(new { message = "Invoice is already paid." });
        }

        invoice.Status = InvoiceStatus.Paid;

        var baseGross = invoice.TotalGross / invoice.ExchangeRateToBase;

        // General Ledger Payment posting
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Customer Payment received: {invoice.CustomerName}",
            Reference = invoice.InvoiceNumber,
            TenantId = UserTenantId
        };

        // 1. Debit Cash / Bank Account (Account "6000") by Gross Amount to increment cash
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "6000",
            Debit = baseGross,
            Credit = 0.0m,
            OriginalAmount = invoice.TotalGross,
            OriginalCurrencyCode = invoice.CurrencyCode,
            ExchangeRate = invoice.ExchangeRateToBase
        });

        // 2. Credit Debtors Control (Account "3000") by Gross Amount to clear customer debt
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "3000",
            Debit = 0.0m,
            Credit = baseGross,
            OriginalAmount = invoice.TotalGross,
            OriginalCurrencyCode = invoice.CurrencyCode,
            ExchangeRate = invoice.ExchangeRateToBase
        });

        _context.LedgerEntries.Add(ledgerEntry);

        // Increment bank account balance
        var bank = await _context.BankAccounts.FirstOrDefaultAsync(b => b.Id == request.BankAccountId);
        if (bank != null)
        {
            bank.CurrentBalance += baseGross; // all bank balances are base currency (GBP)
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Invoice marked as paid and cash ledger posted." });
    }

    // 2. Pay Bill (Outgoing Payment)
    [HttpPost("bills/pay")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> PayBill([FromBody] PayBillRequest request)
    {
        // Outgoing cash payment to clear accounts payable (Trade Creditors)
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Paid vendor bill: {request.Reference}",
            Reference = request.Reference,
            TenantId = UserTenantId
        };

        // Trade Creditors Account (Account "4000") is DEBITED to clear liability
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4000",
            Debit = request.AmountInBaseCurrency,
            Credit = 0.0m,
            OriginalAmount = request.AmountInBaseCurrency,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // Cash / Bank Account (Account "6000") is CREDITED to deduct cash
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "6000",
            Debit = 0.0m,
            Credit = request.AmountInBaseCurrency,
            OriginalAmount = request.AmountInBaseCurrency,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        _context.LedgerEntries.Add(ledgerEntry);

        // Deduct from bank account balance directly
        var bank = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == request.BankAccountId);
        if (bank != null)
        {
            bank.CurrentBalance -= request.AmountInBaseCurrency;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Vendor payment posted successfully and bank balance updated." });
    }

    // 3. Profit & Loss Report
    [HttpGet("reports/profit-loss")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetProfitLoss()
    {
        var ledgerLines = await _context.LedgerLines.ToListAsync();
        var accounts = await _context.LedgerAccounts.ToListAsync();

        var revenueAccounts = accounts.Where(a => a.Type == LedgerAccountType.Revenue || a.AccountCode.StartsWith("1")).ToList();
        var expenseAccounts = accounts.Where(a => a.Type == LedgerAccountType.Expense || a.AccountCode.StartsWith("2")).ToList();

        var revenueDetails = revenueAccounts.Select(acc => {
            var lines = ledgerLines.Where(l => l.AccountCode == acc.AccountCode).ToList();
            var balance = lines.Sum(l => l.Credit - l.Debit);
            return new {
                acc.AccountCode,
                acc.Name,
                Balance = balance
            };
        }).Where(a => a.Balance != 0).ToList();

        var expenseDetails = expenseAccounts.Select(acc => {
            var lines = ledgerLines.Where(l => l.AccountCode == acc.AccountCode).ToList();
            var balance = lines.Sum(l => l.Debit - l.Credit);
            return new {
                acc.AccountCode,
                acc.Name,
                Balance = balance
            };
        }).Where(a => a.Balance != 0).ToList();

        var totalRevenue = revenueDetails.Sum(r => r.Balance);
        var totalExpenses = expenseDetails.Sum(e => e.Balance);

        return Ok(new
        {
            RevenueDetails = revenueDetails,
            ExpenseDetails = expenseDetails,
            TotalRevenue = totalRevenue,
            TotalExpenses = totalExpenses,
            NetProfit = totalRevenue - totalExpenses
        });
    }

    // 4. Balance Sheet Report
    [HttpGet("reports/balance-sheet")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetBalanceSheet()
    {
        var ledgerLines = await _context.LedgerLines.ToListAsync();
        var accounts = await _context.LedgerAccounts.ToListAsync();

        var assetAccounts = accounts.Where(a => a.Type == LedgerAccountType.Asset || a.AccountCode.StartsWith("3") || a.AccountCode.StartsWith("6") || a.AccountCode == "1500").ToList();
        var liabilityAccounts = accounts.Where(a => a.Type == LedgerAccountType.Liability || a.AccountCode.StartsWith("4") || a.AccountCode.StartsWith("5")).ToList();

        var assetDetails = assetAccounts.Select(acc => {
            var lines = ledgerLines.Where(l => l.AccountCode == acc.AccountCode).ToList();
            var balance = lines.Sum(l => l.Debit - l.Credit);
            return new {
                acc.AccountCode,
                acc.Name,
                Balance = balance
            };
        }).Where(a => a.Balance != 0).ToList();

        var liabilityDetails = liabilityAccounts.Select(acc => {
            var lines = ledgerLines.Where(l => l.AccountCode == acc.AccountCode).ToList();
            var balance = lines.Sum(l => l.Credit - l.Debit);
            return new {
                acc.AccountCode,
                acc.Name,
                Balance = balance
            };
        }).Where(a => a.Balance != 0).ToList();

        var totalAssets = assetDetails.Sum(a => a.Balance);
        var totalLiabilities = liabilityDetails.Sum(l => l.Balance);

        return Ok(new
        {
            AssetDetails = assetDetails,
            LiabilityDetails = liabilityDetails,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            NetEquity = totalAssets - totalLiabilities
        });
    }

    // 5. General Ledger list
    [HttpGet("ledger")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetLedger()
    {
        var ledger = await _context.LedgerEntries
            .Include(l => l.Lines)
            .OrderByDescending(l => l.EntryDate)
            .ToListAsync();
        return Ok(ledger);
    }

    // 6. Suppliers (Requires SUP Plugin)
    [HttpGet("suppliers")]
    [RequirePlugin("SUP")]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetSuppliers()
    {
        var suppliers = await _context.Suppliers.ToListAsync();
        return Ok(suppliers);
    }

    [HttpPost("suppliers")]
    [RequirePlugin("SUP")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        var supplier = new Supplier
        {
            Name = request.Name,
            Email = request.Email,
            Address = request.Address,
            DefaultCurrencyCode = request.DefaultCurrencyCode
        };
        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSuppliers), new { id = supplier.Id }, supplier);
    }

    // 7. Purchase Orders (Requires SUP Plugin)
    [HttpGet("purchase-orders")]
    [RequirePlugin("SUP")]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetPurchaseOrders()
    {
        var pos = await _context.PurchaseOrders
            .Include(p => p.Supplier)
            .Include(p => p.CreatedByUser)
            .Include(p => p.Lines)
            .ThenInclude(l => l.StockItem)
            .ToListAsync();
        return Ok(pos);
    }

    [HttpPost("purchase-orders")]
    [RequirePlugin("SUP")]
    [Authorize(Roles = "Accounts,Sales,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request)
    {
        var po = new PurchaseOrder
        {
            OrderNumber = request.OrderNumber,
            SupplierId = request.SupplierId,
            OrderDate = request.OrderDate,
            ExpectedDeliveryDate = request.ExpectedDeliveryDate,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase,
            Status = PurchaseOrderStatus.Draft,
            CreatedByUserId = UserId
        };

        foreach (var reqLine in request.Lines)
        {
            po.Lines.Add(new PurchaseOrderLine
            {
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                ReceivedQuantity = 0
            });
        }

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPurchaseOrders), new { id = po.Id }, po);
    }

    public class CreateInvoiceRequest
    {
        public string InvoiceNumber { get; set; } = null!;
        public string CustomerName { get; set; } = null!;
        public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public InvoiceLineRequest[] Lines { get; set; } = null!;
    }

    public class InvoiceLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
    }

    public class PayBillRequest
    {
        public long BankAccountId { get; set; }
        public decimal AmountInBaseCurrency { get; set; }
        public string Reference { get; set; } = null!;
    }

    public class CreateSupplierRequest
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string DefaultCurrencyCode { get; set; } = "GBP";
    }

    public class CreatePurchaseOrderRequest
    {
        public string OrderNumber { get; set; } = null!;
        public long SupplierId { get; set; }
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public PurchaseOrderLineRequest[] Lines { get; set; } = null!;
    }

    public class PurchaseOrderLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class PayInvoiceRequest
    {
        public long BankAccountId { get; set; }
    }
}
