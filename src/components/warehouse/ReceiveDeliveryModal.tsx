"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";

interface ReceiveDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  purchaseOrders: any[];
  warehouses: any[];
  bins: any[];
  deliveriesCount: number;
  onSuccess: () => void;
}

export default function ReceiveDeliveryModal({
  isOpen,
  onClose,
  token,
  purchaseOrders,
  warehouses,
  bins,
  deliveriesCount,
  onSuccess,
}: ReceiveDeliveryModalProps) {
  const [delPOId, setDelPOId] = useState("");
  const [delNumber, setDelNumber] = useState("");
  const [delQty, setDelQty] = useState(10.0);
  const [delBinId, setDelBinId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [submittingDel, setSubmittingDel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDelNumber(`GRN-2026-000${deliveriesCount + 1}`);
      setDelPOId("");
      setDelQty(10.0);
      setDelBinId("");
      if (warehouses.length > 0) {
        setSelectedWarehouseId(warehouses[0].id.toString());
      }
    }
  }, [isOpen, deliveriesCount, warehouses]);

  if (!isOpen) return null;

  const handleReceiveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDel(true);
    setError(null);
    try {
      const po = purchaseOrders.find(p => p.id === delPOId);
      if (!po) return;

      const payload = {
        purchaseOrderId: delPOId,
        deliveryNumber: delNumber,
        lines: po.lines.map((line: any) => ({
          stockItemId: line.stockItemId,
          quantityDelivered: Number(delQty),
          binLocationId: delBinId === "" ? null : delBinId,
          warehouseId: selectedWarehouseId === "" ? null : Number(selectedWarehouseId)
        }))
      };

      await axios.post("http://localhost:5000/api/warehouse/deliveries", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDelNumber("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to register delivery.");
    } finally {
      setSubmittingDel(false);
    }
  };

  const handlePOChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDelPOId(val);
    const po = purchaseOrders.find(p => p.id === val);
    if (po && po.lines.length > 0) {
      setDelQty(po.lines[0].quantity - (po.lines[0].receivedQuantity || 0));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-5 h-5 text-violet-600" /> Receive Purchase Order Delivery
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleReceiveDelivery} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Select Purchase Order</label>
            <select
              value={delPOId}
              onChange={handlePOChange}
              required
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
            >
              <option value="">Choose Ordered PO</option>
              {purchaseOrders.map(p => (
                <option key={p.id} value={p.id}>{p.orderNumber} - {p.supplier?.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">GRN Delivery Reference</label>
            <input
              type="text"
              required
              value={delNumber}
              onChange={(e) => setDelNumber(e.target.value)}
              placeholder="GRN-2026-0002"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Warehouse</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
              >
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Store in Bin</label>
              <select
                value={delBinId}
                onChange={(e) => setDelBinId(e.target.value)}
                className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
              >
                <option value="">No Bin</option>
                {bins.map(b => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Qty Del.</label>
              <input
                type="number"
                required
                value={delQty}
                onChange={(e) => setDelQty(Number(e.target.value))}
                className="w-full mt-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-750 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDel}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Post GRN Sheets
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
