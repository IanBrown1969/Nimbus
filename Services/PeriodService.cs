using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Services;

public class PeriodService : IPeriodService
{
    private readonly NimbusDbContext _context;

    public PeriodService(NimbusDbContext context)
    {
        _context = context;
    }

    public async Task<bool> IsPeriodLockedAsync(DateTime date)
    {
        var targetDate = date.Date;
        return await _context.AccountingPeriods
            .AnyAsync(ap => ap.IsLocked && targetDate >= ap.StartDate.Date && targetDate <= ap.EndDate.Date);
    }

    public async Task<AccountingPeriod> CreatePeriodAsync(string name, DateTime start, DateTime end)
    {
        var period = new AccountingPeriod
        {
            Name = name,
            StartDate = start,
            EndDate = end,
            IsLocked = false
        };

        _context.AccountingPeriods.Add(period);
        await _context.SaveChangesAsync();
        return period;
    }

    public async Task<AccountingPeriod> SetPeriodLockAsync(long id, bool isLocked)
    {
        var period = await _context.AccountingPeriods.FindAsync(id);
        if (period == null)
        {
            throw new ArgumentException("Accounting period not found.");
        }

        period.IsLocked = isLocked;
        await _context.SaveChangesAsync();
        return period;
    }
}
