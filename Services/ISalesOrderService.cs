using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nimbus.DatabaseStructures.Models;
using static Nimbus.AdminApi.Controllers.SalesOrdersController;

namespace Nimbus.AdminApi.Services;

public class TaxOptionDto
{
    public decimal Rate { get; set; }
    public string ClassCode { get; set; } = null!;
    public string ClassName { get; set; } = null!;
}

public interface ISalesOrderService
{
    Task<SalesOrder> CreateSalesOrderAsync(CreateSalesOrderRequest request, long creatorUserId);
    Task ApproveSalesOrderAsync(long id, long approverUserId);
    Task<decimal> ResolveTaxRateForAddressAsync(string customerName, StockItem stockItem, long? deliveryAddressId, string? deliveryCountryCode = null, decimal requestedTaxRate = 0.0m);
    Task<List<TaxOptionDto>> GetTaxOptionsForAddressAsync(string customerName, long? deliveryAddressId, string? deliveryCountryCode = null);
}
