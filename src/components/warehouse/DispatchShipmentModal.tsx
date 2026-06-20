"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Truck } from "lucide-react";

interface DispatchShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  salesOrders: any[];
  bins: any[];
  shipmentsCount: number;
  onSuccess: () => void;
}

export default function DispatchShipmentModal({
  isOpen,
  onClose,
  token,
  salesOrders,
  bins,
  shipmentsCount,
  onSuccess,
}: DispatchShipmentModalProps) {
  const [shipSOId, setShipSOId] = useState("");
  const [shipNumber, setShipNumber] = useState("");
  const [shipCarrier, setShipCarrier] = useState("DHL");
  const [shipTracking, setShipTracking] = useState("");
  const [shipBinId, setShipBinId] = useState("");
  const [submittingShip, setSubmittingShip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShipNumber(`SH-2026-000${shipmentsCount + 1}`);
      setShipSOId("");
      setShipCarrier("DHL");
      setShipTracking("");
      setShipBinId("");
    }
  }, [isOpen, shipmentsCount]);

  if (!isOpen) return null;

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingShip(true);
    setError(null);
    try {
      const so = salesOrders.find(s => String(s.id) === String(shipSOId));
      if (!so) return;

      const payload = {
        salesOrderId: shipSOId,
        shipmentNumber: shipNumber,
        carrier: shipCarrier,
        trackingNumber: shipTracking,
        lines: so.lines.map((line: any) => ({
          stockItemId: line.stockItemId,
          quantityShipped: line.quantity,
          binLocationId: shipBinId === "" ? null : shipBinId
        }))
      };

      await axios.post("http://localhost:5000/api/warehouse/shipments", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShipNumber("");
      setShipTracking("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to dispatch shipment.");
    } finally {
      setSubmittingShip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-violet-650" /> Dispatch Customer Shipment
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Select Approved Sales Order</label>
            <select
              value={shipSOId}
              onChange={(e) => setShipSOId(e.target.value)}
              required
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
            >
              <option value="">Choose SO</option>
              {salesOrders.map(s => (
                <option key={s.id} value={s.id}>{s.orderNumber} - {s.customerName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Shipment Number</label>
              <input
                type="text"
                required
                value={shipNumber}
                onChange={(e) => setShipNumber(e.target.value)}
                placeholder="SH-2026-0002"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Carrier</label>
              <input
                type="text"
                required
                value={shipCarrier}
                onChange={(e) => setShipCarrier(e.target.value)}
                placeholder="DHL / DPD"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Tracking Number</label>
            <input
              type="text"
              required
              value={shipTracking}
              onChange={(e) => setShipTracking(e.target.value)}
              placeholder="TRK-987654321-UK"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Dispatch From Bin</label>
            <select
              value={shipBinId}
              onChange={(e) => setShipBinId(e.target.value)}
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
            >
              <option value="">No Bin</option>
              {bins.map(b => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </select>
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
              disabled={submittingShip}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Confirm Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
