using System;
using System.Threading.Tasks;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.AdminApi.Services;

public interface IPeriodService
{
    Task<bool> IsPeriodLockedAsync(DateTime date);
    Task<AccountingPeriod> CreatePeriodAsync(string name, DateTime start, DateTime end);
    Task<AccountingPeriod> SetPeriodLockAsync(long id, bool isLocked);
}
