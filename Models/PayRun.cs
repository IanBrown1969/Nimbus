using System;
using System.Collections.Generic;

namespace Nimbus.DatabaseStructures.Models;

public enum PayRunStatus
{
    Draft,
    Processed,
    Paid
}

public class PayRun
{
    public long Id { get; set; }
public long TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    
    public DateTime? ProcessedDate { get; set; }
    public PayRunStatus Status { get; set; } = PayRunStatus.Draft;

    public ICollection<PaySlip> PaySlips { get; set; } = new List<PaySlip>();
}
