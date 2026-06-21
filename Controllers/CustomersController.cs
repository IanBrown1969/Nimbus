using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Controllers;

[Authorize]
[Route("api/customers")]
public class CustomersController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public CustomersController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers()
    {
        var customers = await _context.Customers
            .Include(c => c.Country)
            .Include(c => c.Addresses)
            .ThenInclude(a => a.Country)
            .OrderBy(c => c.CustomerRef)
            .ToListAsync();

        var invoices = await _context.Invoices
            .Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Draft)
            .ToListAsync();

        var now = DateTime.UtcNow;

        foreach (var c in customers)
        {
            var cInvoices = invoices
                .Where(i => i.CustomerName == c.Name || i.CustomerName == c.CompanyName)
                .ToList();

            c.TotalDebt = cInvoices.Sum(i => i.TotalGross);
            c.AgedDebt = new AgedDebtBreakdown
            {
                Current = cInvoices.Where(i => (now - i.InvoiceDate).TotalDays <= 30).Sum(i => i.TotalGross),
                Over30 = cInvoices.Where(i => { var d = (now - i.InvoiceDate).TotalDays; return d > 30 && d <= 60; }).Sum(i => i.TotalGross),
                Over60 = cInvoices.Where(i => { var d = (now - i.InvoiceDate).TotalDays; return d > 60 && d <= 90; }).Sum(i => i.TotalGross),
                Over90 = cInvoices.Where(i => (now - i.InvoiceDate).TotalDays > 90).Sum(i => i.TotalGross)
            };
        }

        return Ok(customers);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomer(long id)
    {
        var customer = await _context.Customers
            .Include(c => c.Country)
            .Include(c => c.Addresses)
            .ThenInclude(a => a.Country)
            .FirstOrDefaultAsync(c => c.Id == id);
            
        if (customer == null)
        {
            return NotFound();
        }

        var invoices = await _context.Invoices
            .Where(i => (i.CustomerName == customer.Name || i.CustomerName == customer.CompanyName) 
                        && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Draft)
            .ToListAsync();

        var now = DateTime.UtcNow;

        customer.TotalDebt = invoices.Sum(i => i.TotalGross);
        customer.AgedDebt = new AgedDebtBreakdown
        {
            Current = invoices.Where(i => (now - i.InvoiceDate).TotalDays <= 30).Sum(i => i.TotalGross),
            Over30 = invoices.Where(i => { var d = (now - i.InvoiceDate).TotalDays; return d > 30 && d <= 60; }).Sum(i => i.TotalGross),
            Over60 = invoices.Where(i => { var d = (now - i.InvoiceDate).TotalDays; return d > 60 && d <= 90; }).Sum(i => i.TotalGross),
            Over90 = invoices.Where(i => (now - i.InvoiceDate).TotalDays > 90).Sum(i => i.TotalGross)
        };

        return Ok(customer);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,Sales,Accounts,GlobalAdmin")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        // Generate unique CustomerRef for this tenant
        var currentCount = await _context.Customers.IgnoreQueryFilters()
            .Where(c => c.TenantId == UserTenantId)
            .CountAsync();
        var nextRefNum = currentCount + 1;
        var customerRef = $"CUST-{nextRefNum:D4}";

        if (request.CreditContractDays != 30 && request.CreditContractDays != 60 && request.CreditContractDays != 90)
        {
            return BadRequest(new { message = "Credit contract term must be either Net 30, 60, or 90 days." });
        }

        var customer = new Customer
        {
            CustomerRef = customerRef,
            Name = request.Name,
            CompanyName = request.CompanyName,
            Email = request.Email,
            Phone = request.Phone,
            DefaultCurrencyCode = request.DefaultCurrencyCode,
            IsActive = true,
            CountryId = request.CountryId,
            CreditContractDays = request.CreditContractDays
        };

        if (request.Addresses != null)
        {
            foreach (var addr in request.Addresses)
            {
                customer.Addresses.Add(new CustomerAddress
                {
                    AddressName = addr.AddressName,
                    AddressLine1 = addr.AddressLine1,
                    AddressLine2 = addr.AddressLine2,
                    City = addr.City,
                    State = addr.State,
                    PostalCode = addr.PostalCode,
                    CountryId = addr.CountryId,
                    AddressType = addr.AddressType,
                    IsDefault = addr.IsDefault
                });
            }
        }

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    [HttpPost("{id}")]
    [Authorize(Roles = "CompanyAdmin,Sales,Accounts,GlobalAdmin")]
    public async Task<IActionResult> UpdateCustomer(long id, [FromBody] UpdateCustomerRequest request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
        {
            return NotFound();
        }

        if (request.CreditContractDays != 30 && request.CreditContractDays != 60 && request.CreditContractDays != 90)
        {
            return BadRequest(new { message = "Credit contract term must be either Net 30, 60, or 90 days." });
        }

        customer.Name = request.Name;
        customer.CompanyName = request.CompanyName;
        customer.Email = request.Email;
        customer.Phone = request.Phone;
        customer.DefaultCurrencyCode = request.DefaultCurrencyCode;
        customer.CountryId = request.CountryId;
        customer.IsActive = request.IsActive;
        customer.CreditContractDays = request.CreditContractDays;

        await _context.SaveChangesAsync();
        return Ok(customer);
    }

    [HttpPost("{id}/addresses")]
    [Authorize(Roles = "CompanyAdmin,Sales,Accounts,GlobalAdmin")]
    public async Task<IActionResult> AddAddress(long id, [FromBody] AddAddressRequest request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
        {
            return NotFound();
        }

        var address = new CustomerAddress
        {
            CustomerId = id,
            AddressName = request.AddressName,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            CountryId = request.CountryId,
            AddressType = request.AddressType,
            IsDefault = request.IsDefault
        };

        _context.CustomerAddresses.Add(address);
        await _context.SaveChangesAsync();

        return Ok(address);
    }

    public class CreateCustomerRequest
    {
        public string Name { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string DefaultCurrencyCode { get; set; } = "GBP";
        public long? CountryId { get; set; }
        public int CreditContractDays { get; set; } = 30;
        public List<AddressRequest>? Addresses { get; set; }
    }

    public class AddressRequest
    {
        public string AddressName { get; set; } = null!;
        public string AddressLine1 { get; set; } = null!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = null!;
        public string? State { get; set; }
        public string PostalCode { get; set; } = null!;
        public long? CountryId { get; set; }
        public string AddressType { get; set; } = "Billing"; // "Billing" or "Shipping"
        public bool IsDefault { get; set; }
    }

    public class AddAddressRequest
    {
        public string AddressName { get; set; } = null!;
        public string AddressLine1 { get; set; } = null!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = null!;
        public string? State { get; set; }
        public string PostalCode { get; set; } = null!;
        public long? CountryId { get; set; }
        public string AddressType { get; set; } = "Billing";
        public bool IsDefault { get; set; }
    }

    public class UpdateCustomerRequest
    {
        public string Name { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string DefaultCurrencyCode { get; set; } = "GBP";
        public long? CountryId { get; set; }
        public bool IsActive { get; set; }
        public int CreditContractDays { get; set; } = 30;
    }
}
