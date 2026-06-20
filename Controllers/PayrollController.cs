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
[Route("api/finance/payroll")]
public class PayrollController : ApiControllerBase
{
    private readonly NimbusDbContext _context;

    public PayrollController(NimbusDbContext context)
    {
        _context = context;
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees()
    {
        var employees = await _context.Employees.ToListAsync();
        return Ok(employees);
    }

    [HttpPost("employees")]
    [Authorize(Roles = "CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeRequest request)
    {
        var employee = new Employee
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            NationalInsuranceNumber = request.NationalInsuranceNumber,
            TaxCode = request.TaxCode,
            MonthlySalary = request.MonthlySalary
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmployees), new { id = employee.Id }, employee);
    }

    [HttpGet("runs")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> GetPayRuns()
    {
        var runs = await _context.PayRuns
            .Include(r => r.PaySlips)
            .ThenInclude(p => p.Employee)
            .ToListAsync();
        return Ok(runs);
    }

    [HttpPost("runs")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> CreatePayRun([FromBody] CreatePayRunRequest request)
    {
        var run = new PayRun
        {
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            Status = PayRunStatus.Draft
        };

        _context.PayRuns.Add(run);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPayRuns), new { id = run.Id }, run);
    }

    [HttpPost("runs/{id}/process")]
    [Authorize(Roles = "Accounts,CompanyAdmin,GlobalAdmin")]
    public async Task<IActionResult> ProcessPayRun(long id)
    {
        var run = await _context.PayRuns
            .Include(r => r.PaySlips)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (run == null) return NotFound();
        if (run.Status != PayRunStatus.Draft)
        {
            return BadRequest(new { message = "Payrun is already processed." });
        }

        // Fetch active employees
        var employees = await _context.Employees.Where(e => e.IsActive).ToListAsync();

        decimal totalGross = 0m;
        decimal totalTax = 0m;
        decimal totalNi = 0m;

        foreach (var emp in employees)
        {
            // Simplified payroll math: 20% Income Tax, 8% National Insurance
            var gross = emp.MonthlySalary;
            var tax = gross * 0.20m;
            var ni = gross * 0.08m;

            var payslip = new PaySlip
            {
                PayRunId = run.Id,
                EmployeeId = emp.Id,
                GrossPay = gross,
                TaxDeduction = tax,
                NationalInsuranceDeduction = ni
            };

            totalGross += gross;
            totalTax += tax;
            totalNi += ni;

            run.PaySlips.Add(payslip);
        }

        run.Status = PayRunStatus.Processed;
        run.ProcessedDate = DateTime.UtcNow;

        // Post balanced double-entry wage journals to General Ledger
        var ledgerEntry = new LedgerEntry
        {
            EntryDate = DateTime.UtcNow,
            Description = $"Monthly Wages Posting - Period: {run.PeriodStart:dd/MM} to {run.PeriodEnd:dd/MM}",
            Reference = $"PAY-{run.Id.ToString().Substring(0, 8)}",
            TenantId = UserTenantId
        };

        // 1. Debit Salaries Expense (Account "2100" - Gross Wages)
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "2100", // Gross Wages expense
            Debit = totalGross,
            Credit = 0.0m,
            OriginalAmount = totalGross,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 2. Credit PAYE & NI Liability (Account "4100" - HMRC Liability)
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4100", // Tax/NI Liability
            Debit = 0.0m,
            Credit = totalTax + totalNi,
            OriginalAmount = totalTax + totalNi,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // 3. Credit Net Wages Payable (Account "4200" - Net Wages due to employees)
        var totalNet = totalGross - totalTax - totalNi;
        ledgerEntry.Lines.Add(new LedgerLine
        {
            AccountCode = "4200", // Wages Payable
            Debit = 0.0m,
            Credit = totalNet,
            OriginalAmount = totalNet,
            OriginalCurrencyCode = "GBP",
            ExchangeRate = 1.0m
        });

        // Validate journal balance
        var dSum = ledgerEntry.Lines.Sum(l => l.Debit);
        var cSum = ledgerEntry.Lines.Sum(l => l.Credit);
        if (Math.Abs(dSum - cSum) > 0.01m)
        {
            return BadRequest(new { message = "Ledger mismatch." });
        }

        _context.LedgerEntries.Add(ledgerEntry);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payrun calculated, slips generated, and General Ledger posted." });
    }

    public class CreateEmployeeRequest
    {
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string NationalInsuranceNumber { get; set; } = null!;
        public string TaxCode { get; set; } = "1257L";
        public decimal MonthlySalary { get; set; }
    }

    public class CreatePayRunRequest
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }
}
