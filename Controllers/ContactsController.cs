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
[Route("api/contacts")]
public class ContactsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public ContactsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetContacts([FromQuery] string? type)
    {
        var query = _context.Contacts.AsQueryable();

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<ContactType>(type, true, out var parsedType))
        {
            query = query.Where(c => c.Type == parsedType);
        }

        var contacts = await query.ToListAsync();
        return Ok(contacts);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,Sales,Accounts,GlobalAdmin")]
    public async Task<IActionResult> CreateContact([FromBody] CreateContactRequest request)
    {
        var contact = new Contact
        {
            Name = request.Name,
            CompanyName = request.CompanyName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            DefaultCurrencyCode = request.DefaultCurrencyCode,
            Type = request.Type
        };

        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetContacts), new { id = contact.Id }, contact);
    }

    public class CreateContactRequest
    {
        public string Name { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string DefaultCurrencyCode { get; set; } = "GBP";
        public ContactType Type { get; set; }
    }
}
