using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Nimbus.AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApiControllerBase : ControllerBase
{
    protected long UserTenantId
    {
        get
        {
            var tenantClaim = User.FindFirst("TenantId")?.Value;
            return long.TryParse(tenantClaim, out var id) ? id : 0;
        }
    }

    protected long UserId
    {
        get
        {
            var userClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return long.TryParse(userClaim, out var id) ? id : 0;
        }
    }

    protected string UserRole
    {
        get
        {
            return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        }
    }
}
