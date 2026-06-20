using System.Threading.Tasks;
using Nimbus.DatabaseStructures.Models;
using static Nimbus.AdminApi.Controllers.DeliveriesController;

namespace Nimbus.AdminApi.Services;

public interface IDeliveryService
{
    Task<Delivery> CreateDeliveryAsync(CreateDeliveryRequest request, long receivedByUserId);
}
