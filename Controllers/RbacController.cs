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
[ApiController]
[Route("api/rbac")]
public class RbacController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public RbacController(NimbusDbContext context)
    {
        _context = context;
    }

    public class UpdatePermissionRequest
    {
        public string Role { get; set; } = null!;
        public string Area { get; set; } = null!;
        public bool IsAllowed { get; set; }
    }

    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    [HttpGet]
    public async Task<IActionResult> GetPermissions()
    {
        var list = await _context.RolePermissions.ToListAsync();
        
        var result = list.Select(rp => new
        {
            rp.Id,
            Role = rp.Role.ToString(),
            rp.Area,
            rp.IsAllowed
        });

        return Ok(result);
    }

    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    [HttpPost]
    public async Task<IActionResult> UpdatePermissions([FromBody] List<UpdatePermissionRequest> requests)
    {
        foreach (var req in requests)
        {
            if (!Enum.TryParse<Nimbus.DatabaseStructures.Models.UserRole>(req.Role, out var roleEnum))
            {
                continue;
            }

            // Do not allow changing CompanyAdmin or GlobalAdmin permissions
            if (roleEnum == Nimbus.DatabaseStructures.Models.UserRole.CompanyAdmin || roleEnum == Nimbus.DatabaseStructures.Models.UserRole.GlobalAdmin)
            {
                continue;
            }

            var perm = await _context.RolePermissions
                .FirstOrDefaultAsync(rp => rp.Role == roleEnum && rp.Area == req.Area);

            if (perm != null)
            {
                perm.IsAllowed = req.IsAllowed;
            }
            else
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    TenantId = UserTenantId,
                    Role = roleEnum,
                    Area = req.Area,
                    IsAllowed = req.IsAllowed
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Permissions updated successfully." });
    }

    [HttpGet("my-permissions")]
    public async Task<IActionResult> GetMyPermissions()
    {
        if (!Enum.TryParse<Nimbus.DatabaseStructures.Models.UserRole>(UserRole, out var roleEnum))
        {
            return BadRequest(new { message = "Invalid user role." });
        }

        // CompanyAdmin and GlobalAdmin always have access to all areas
        if (roleEnum == Nimbus.DatabaseStructures.Models.UserRole.CompanyAdmin || roleEnum == Nimbus.DatabaseStructures.Models.UserRole.GlobalAdmin)
        {
            var allAreas = new[] { "financials", "sales", "purchasing", "banking", "inventory", "hr", "admin" };
            return Ok(allAreas);
        }

        var allowedAreas = await _context.RolePermissions
            .Where(rp => rp.Role == roleEnum && rp.IsAllowed)
            .Select(rp => rp.Area)
            .ToListAsync();

        return Ok(allowedAreas);
    }

    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                Role = u.Role.ToString(),
                u.IsActive
            })
            .ToListAsync();

        return Ok(users);
    }

    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    [HttpPost("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(long userId, [FromBody] UpdateUserRoleRequest request)
    {
        if (!Enum.TryParse<Nimbus.DatabaseStructures.Models.UserRole>(request.Role, out var roleEnum))
        {
            return BadRequest(new { message = "Invalid role specified." });
        }

        var targetUser = await _context.Users.FindAsync(userId);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found." });
        }

        // Prevent self-demotion
        if (targetUser.Id == UserId && roleEnum != Nimbus.DatabaseStructures.Models.UserRole.CompanyAdmin && roleEnum != Nimbus.DatabaseStructures.Models.UserRole.GlobalAdmin)
        {
            return BadRequest(new { message = "You cannot demote yourself from the Administrator role." });
        }

        targetUser.Role = roleEnum;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Successfully assigned user {targetUser.Username} to role {roleEnum}." });
    }

    public class UpdateUserRoleRequest
    {
        public string Role { get; set; } = null!;
    }
}
