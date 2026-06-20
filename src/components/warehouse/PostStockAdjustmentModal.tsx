"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle } from "lucide-react";

interface PostStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  stock: any[];
  bins: any[];
  warehouses: any[];
  onSuccess: () => void;
  getTranslatedName: (nameJsonStr: string) => string;
}

export default function PostStockAdjustmentModal({
  isOpen,
  onClose,
  token,
  stock,
  bins,
  warehouses,
  onSuccess,
  getTranslatedName,
}: PostStockAdjustmentModalProps) {
  const [adjStockId, setAdjStockId] = useState("");
  const [adjBinId, setAdjBinId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [adjQty, setAdjQty] = useState(10.0);
  const [adjReason, setAdjReason] = useState("");
  const [submittingAdj, setSubmittingAdj] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dropdown options when data loads or modal opens
  useEffect(() => {
    if (isOpen) {
      if (stock.length > 0) {
        setAdjStockId(stock[0].id.toString());
      }
      if (bins.length > 0) {
        setAdjBinId(bins[0].id.toString());
      } else {
        setAdjBinId("");
      }
      if (warehouses.length > 0) {
        setSelectedWarehouseId(warehouses[0].id.toString());
      }
    }
  }, [isOpen, stock, bins, warehouses]);

  if (!isOpen) return null;

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdj(true);
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/warehouse/adjustments", {
        stockItemId: adjStockId,
        binLocationId: adjBinId === "" ? null : adjBinId,
        warehouseId: selectedWarehouseId === "" ? 0 : Number(selectedWarehouseId),
        quantityChanged: Number(adjQty),
        reason: adjReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdjQty(10);
      setAdjReason("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post adjustment.");
    } finally {
      setSubmittingAdj(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-violet-600" /> Post Stock Adjustment
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRecordAdjustment} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Select Product SKU</label>
            <select
              value={adjStockId}
              onChange={(e) => setAdjStockId(e.target.value)}
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
            >
              {stock.map(s => (
                <option key={s.id} value={s.id}>{s.sku} - {getTranslatedName(s.name)}</option>
              ))}
            </select>
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
              <label className="text-[10px] font-bold uppercase text-slate-500">Target Bin</label>
              <select
                value={adjBinId}
                onChange={(e) => setAdjBinId(e.target.value)}
                className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
              >
                <option value="">No Bin</option>
                {bins.map(b => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Qty Delta</label>
              <input
                type="number"
                required
                value={adjQty}
                onChange={(e) => setAdjQty(Number(e.target.value))}
                className="w-full mt-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-750 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Reason / Notes</label>
            <input
              type="text"
              required
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Damaged stock write-off / discovered in aisle"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-755 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAdj}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Post Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
