using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/quotes")]
public class QuotesController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public QuotesController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuotes()
    {
        var quotes = await _context.Quotes
            .Include(q => q.Lines)
            .ThenInclude(l => l.StockItem)
            .ToListAsync();
        return Ok(quotes);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,Sales,GlobalAdmin")]
    public async Task<IActionResult> CreateQuote([FromBody] CreateQuoteRequest request)
    {
        var quote = new Quote
        {
            QuoteNumber = request.QuoteNumber,
            CustomerName = request.CustomerName,
            QuoteDate = request.QuoteDate,
            ExpiryDate = request.ExpiryDate,
            CurrencyCode = request.CurrencyCode,
            ExchangeRateToBase = request.ExchangeRateToBase <= 0 ? 1.0m : request.ExchangeRateToBase,
            Status = QuoteStatus.Draft
        };

        decimal totalNet = 0.0m;
        decimal totalTax = 0.0m;

        foreach (var reqLine in request.Lines)
        {
            var line = new QuoteLine
            {
                StockItemId = reqLine.StockItemId,
                Quantity = reqLine.Quantity,
                UnitPrice = reqLine.UnitPrice,
                TaxRate = reqLine.TaxRate
            };

            totalNet += line.NetAmount;
            totalTax += line.TaxAmount;

            quote.Lines.Add(line);
        }

        quote.TotalNet = totalNet;
        quote.TotalTax = totalTax;

        _context.Quotes.Add(quote);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuotes), new { id = quote.Id }, quote);
    }

    public class CreateQuoteRequest
    {
        public string QuoteNumber { get; set; } = null!;
        public string CustomerName { get; set; } = null!;
        public DateTime QuoteDate { get; set; } = DateTime.UtcNow;
        public DateTime ExpiryDate { get; set; } = DateTime.UtcNow.AddDays(30);
        public string CurrencyCode { get; set; } = "GBP";
        public decimal ExchangeRateToBase { get; set; } = 1.0m;
        public QuoteLineRequest[] Lines { get; set; } = null!;
    }

    public class QuoteLineRequest
    {
        public long StockItemId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
    }
}
