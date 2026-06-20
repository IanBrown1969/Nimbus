using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nimbus.DatabaseStructures.Models;
using static Nimbus.AdminApi.Controllers.SalesOrdersController;

namespace Nimbus.AdminApi.Services;

public interface ISalesOrderService
{
    Task<SalesOrder> CreateSalesOrderAsync(CreateSalesOrderRequest request, long creatorUserId);
    Task ApproveSalesOrderAsync(long id, long approverUserId);
}
