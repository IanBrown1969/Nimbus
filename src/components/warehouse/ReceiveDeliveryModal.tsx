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

interface GRNLine {
  stockItemId: number;
  sku: string;
  name: string;
  orderedQty: number;
  receivedQty: number;
  quantityDelivered: number;
  warehouseId: string;
  binLocationId: string;
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
  const [grnLines, setGrnLines] = useState<GRNLine[]>([]);
  const [submittingDel, setSubmittingDel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDelNumber(`GRN-2026-000${deliveriesCount + 1}`);
      setDelPOId("");
      setGrnLines([]);
    }
  }, [isOpen, deliveriesCount]);

  if (!isOpen) return null;

  const getTranslatedName = (nameJsonStr: string) => {
    try {
      const translations = JSON.parse(nameJsonStr);
      return translations["en-GB"] || nameJsonStr;
    } catch {
      return nameJsonStr;
    }
  };

  const handlePOChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDelPOId(val);
    const po = purchaseOrders.find(p => String(p.id) === String(val));
    if (po) {
      const defaultWh = warehouses.length > 0 ? warehouses[0].id.toString() : "";
      const linesData = po.lines.map((line: any) => ({
        stockItemId: line.stockItemId,
        sku: line.stockItem?.sku || "",
        name: getTranslatedName(line.stockItem?.nameJson || "{}"),
        orderedQty: line.quantity,
        receivedQty: line.receivedQuantity || 0,
        quantityDelivered: Math.max(0, line.quantity - (line.receivedQuantity || 0)),
        warehouseId: defaultWh,
        binLocationId: ""
      }));
      setGrnLines(linesData);
    } else {
      setGrnLines([]);
    }
  };

  const handleLineQtyChange = (index: number, val: number) => {
    const updated = [...grnLines];
    updated[index].quantityDelivered = val;
    setGrnLines(updated);
  };

  const handleLineWHChange = (index: number, val: string) => {
    const updated = [...grnLines];
    updated[index].warehouseId = val;
    setGrnLines(updated);
  };

  const handleLineBinChange = (index: number, val: string) => {
    const updated = [...grnLines];
    updated[index].binLocationId = val;
    setGrnLines(updated);
  };

  const handleReceiveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDel(true);
    setError(null);

    if (!delPOId) {
      setError("Please select a purchase order.");
      setSubmittingDel(false);
      return;
    }

    if (grnLines.length === 0) {
      setError("No lines found in the selected purchase order.");
      setSubmittingDel(false);
      return;
    }

    try {
      const payload = {
        purchaseOrderId: Number(delPOId),
        deliveryNumber: delNumber,
        lines: grnLines.map((line) => ({
          stockItemId: line.stockItemId,
          quantityDelivered: Number(line.quantityDelivered),
          binLocationId: line.binLocationId === "" ? null : Number(line.binLocationId),
          warehouseId: line.warehouseId === "" ? null : Number(line.warehouseId)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-5 h-5 text-violet-600" /> Receive Purchase Order Delivery
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleReceiveDelivery} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Select Purchase Order</label>
              <select
                value={delPOId}
                onChange={handlePOChange}
                required
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-violet-500"
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
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-violet-500"
              />
            </div>
          </div>

          {/* PO Lines Editor */}
          {grnLines.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-800 block">Deliveries Line Items</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-3 w-36">Warehouse</th>
                      <th className="py-2.5 px-3 w-36">Store in Bin</th>
                      <th className="py-2.5 px-3 w-28 text-right">Qty Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {grnLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-violet-650 block">{line.sku}</span>
                          <span className="text-[10px] text-slate-450 block truncate max-w-[200px] mt-0.5">{line.name}</span>
                          <span className="inline-block mt-1 text-[9px] text-slate-450 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            Ord: {line.orderedQty} | Rec: {line.receivedQty}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={line.warehouseId}
                            onChange={(e) => handleLineWHChange(idx, e.target.value)}
                            required
                            className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-violet-500 text-slate-750 cursor-pointer"
                          >
                            <option value="">Select WH</option>
                            {warehouses.map(wh => (
                              <option key={wh.id} value={wh.id}>{wh.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={line.binLocationId}
                            onChange={(e) => handleLineBinChange(idx, e.target.value)}
                            className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-violet-500 text-slate-750 cursor-pointer"
                          >
                            <option value="">No Bin</option>
                            {bins.map(b => (
                              <option key={b.id} value={b.id}>{b.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            required
                            min="0"
                            value={line.quantityDelivered}
                            onChange={(e) => handleLineQtyChange(idx, Number(e.target.value))}
                            className="w-20 text-right text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white focus:border-violet-500 text-slate-750 inline-block font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDel || grnLines.length === 0}
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
