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
[Route("api/finance/payments")]
public class PaymentsController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public PaymentsController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet("gateways")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetGateways()
    {
        var gateways = await _context.PaymentGateways.ToListAsync();
        return Ok(gateways);
    }

    [HttpPost("gateways")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateOrUpdateGateway([FromBody] CreateOrUpdateGatewayRequest request)
    {
        PaymentGateway? gateway;
        if (request.Id.HasValue && request.Id.Value > 0)
        {
            gateway = await _context.PaymentGateways.FindAsync(request.Id.Value);
            if (gateway == null) return NotFound("Payment gateway not found.");
            
            gateway.Name = request.Name;
            gateway.Provider = request.Provider;
            gateway.SettlementAccountId = request.SettlementAccountId;
            gateway.ProcessingFee = request.ProcessingFee;
        }
        else
        {
            gateway = new PaymentGateway
            {
                TenantId = UserTenantId,
                Name = request.Name,
                Provider = request.Provider,
                SettlementAccountId = request.SettlementAccountId,
                ProcessingFee = request.ProcessingFee,
                Status = "inactive"
            };
            _context.PaymentGateways.Add(gateway);
        }

        await _context.SaveChangesAsync();
        return Ok(gateway);
    }

    [HttpPost("gateways/{id}/toggle")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ToggleGatewayStatus(long id)
    {
        var gateway = await _context.PaymentGateways.FindAsync(id);
        if (gateway == null) return NotFound("Payment gateway not found.");

        gateway.Status = gateway.Status == "active" ? "inactive" : "active";
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Payment gateway status toggled to '{gateway.Status}'.", gateway });
    }

    [HttpPost("gateways/{id}/credentials")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> SaveCredentials(long id, [FromBody] SaveCredentialsRequest request)
    {
        var gateway = await _context.PaymentGateways.FindAsync(id);
        if (gateway == null) return NotFound("Payment gateway not found.");

        gateway.SecretKey = request.SecretKey;
        gateway.WebhookSecret = request.WebhookSecret;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Credentials saved successfully.", gateway });
    }

    public class CreateOrUpdateGatewayRequest
    {
        public long? Id { get; set; }
        public string Name { get; set; } = null!;
        public string Provider { get; set; } = null!;
        public long SettlementAccountId { get; set; }
        public string ProcessingFee { get; set; } = null!;
    }

    public class SaveCredentialsRequest
    {
        public string? SecretKey { get; set; }
        public string? WebhookSecret { get; set; }
    }
}
