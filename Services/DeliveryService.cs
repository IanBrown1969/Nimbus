using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Data;
using Nimbus.DatabaseStructures.Models;
using static Nimbus.AdminApi.Controllers.DeliveriesController;

namespace Nimbus.AdminApi.Services;

public class DeliveryService : IDeliveryService
{
    private readonly NimbusDbContext _context;

    public DeliveryService(NimbusDbContext context)
    {
        _context = context;
    }

    public async Task<Delivery> CreateDeliveryAsync(CreateDeliveryRequest request, long receivedByUserId)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseOrderId);

        if (po == null)
        {
            throw new ArgumentException("Purchase Order not found.");
        }

        // Segregation of Duties Check
        // if (po.CreatedByUserId == receivedByUserId)
        // {
        //     throw new InvalidOperationException("Segregation of duties violation: You cannot receive a delivery for a purchase order that you created.");
        // }

        var delivery = new Delivery
        {
            PurchaseOrderId = po.Id,
            DeliveryNumber = request.DeliveryNumber,
            DeliveryDate = DateTime.UtcNow,
            ReceivedByUserId = receivedByUserId
        };

        var firstWarehouse = await _context.Warehouses.FirstOrDefaultAsync();
        var defaultWarehouseId = firstWarehouse?.Id ?? 0;

        foreach (var reqLine in request.Lines)
        {
            long lineWarehouseId = reqLine.WarehouseId ?? 0;
            if (lineWarehouseId == 0 && reqLine.BinLocationId.HasValue)
            {
                var bin = await _context.BinLocations.FindAsync(reqLine.BinLocationId.Value);
                if (bin != null)
                {
                    lineWarehouseId = bin.WarehouseId;
                }
            }
            if (lineWarehouseId == 0)
            {
                lineWarehouseId = defaultWarehouseId;
            }

            var line = new DeliveryLine
            {
                DeliveryId = delivery.Id,
                StockItemId = reqLine.StockItemId,
                QuantityDelivered = reqLine.QuantityDelivered,
                BinLocationId = reqLine.BinLocationId,
                WarehouseId = lineWarehouseId
            };

            delivery.Lines.Add(line);

            // Update PurchaseOrderLine.ReceivedQuantity
            var poLine = po.Lines.FirstOrDefault(l => l.StockItemId == reqLine.StockItemId);
            if (poLine != null)
            {
                poLine.ReceivedQuantity += (int)reqLine.QuantityDelivered;
            }

            // Update StockInventory
            var inventory = await _context.StockInventories
                .FirstOrDefaultAsync(i => i.StockItemId == reqLine.StockItemId && i.BinLocationId == reqLine.BinLocationId && i.WarehouseId == lineWarehouseId);

            if (inventory == null)
            {
                inventory = new StockInventory
                {
                    StockItemId = reqLine.StockItemId,
                    BinLocationId = reqLine.BinLocationId,
                    WarehouseId = lineWarehouseId,
                    Quantity = 0.0m
                };
                _context.StockInventories.Add(inventory);
            }

            var stockItem = await _context.StockItems.FindAsync(reqLine.StockItemId);
            var qtyInStockUnits = reqLine.QuantityDelivered / (stockItem?.ConversionRatio ?? 1.0m);
            inventory.Quantity += qtyInStockUnits;
        }

        // Check if all lines are fully received
        bool allReceived = po.Lines.All(l => l.ReceivedQuantity >= l.Quantity);
        if (allReceived)
        {
            po.Status = PurchaseOrderStatus.Received;
        }
        else
        {
            po.Status = PurchaseOrderStatus.Ordered; // partially received
        }

        _context.Deliveries.Add(delivery);
        await _context.SaveChangesAsync();

        return delivery;
    }
}
