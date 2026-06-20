using System;

namespace Nimbus.DatabaseStructures.Models;

public class PaySlip
{
    public long Id { get; set; }
public long PayRunId { get; set; }
    public PayRun PayRun { get; set; } = null!;

    public long EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public decimal GrossPay { get; set; }
    public decimal TaxDeduction { get; set; }
    public decimal NationalInsuranceDeduction { get; set; }
    public decimal NetPay => GrossPay - TaxDeduction - NationalInsuranceDeduction;
}
