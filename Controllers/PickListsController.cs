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
[Route("api/warehouse/pick-lists")]
public class PickListsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public PickListsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetPickLists()
    {
        var pickLists = await _context.PickLists
            .Include(p => p.SalesOrder)
            .Include(p => p.CompletedByUser)
            .Include(p => p.Lines)
            .ThenInclude(l => l.StockItem)
            .Include(p => p.Lines)
            .ThenInclude(l => l.BinLocation)
            .OrderByDescending(p => p.CreatedDate)
            .ToListAsync();
        return Ok(pickLists);
    }

    [HttpPost("{id}/complete")]
    [Authorize(Roles = "Warehouse,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CompletePickList(long id, [FromBody] CompletePickRequest request)
    {
        var pickList = await _context.PickLists
            .Include(p => p.Lines)
            .Include(p => p.SalesOrder)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pickList == null) return NotFound();
        if (pickList.IsCompleted)
        {
            return BadRequest(new { message = "Pick list has already been completed." });
        }

        foreach (var reqLine in request.Lines)
        {
            var line = pickList.Lines.FirstOrDefault(l => l.Id == reqLine.LineId);
            if (line != null)
            {
                line.QuantityPicked = reqLine.QuantityPicked;
                line.BinLocationId = reqLine.BinLocationId;
            }
        }

        pickList.IsCompleted = true;
        pickList.CompletedDate = DateTime.UtcNow;
        pickList.CompletedByUserId = UserId;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Pick list completed.", isCompleted = pickList.IsCompleted });
    }

    public class CompletePickRequest
    {
        public PickLineUpdate[] Lines { get; set; } = null!;
    }

    public class PickLineUpdate
    {
        public long LineId { get; set; }
        public decimal QuantityPicked { get; set; }
        public long? BinLocationId { get; set; }
    }
}
