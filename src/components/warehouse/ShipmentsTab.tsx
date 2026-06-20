"use client";

import React from "react";
import { Truck, Lock } from "lucide-react";

interface ShipmentsTabProps {
  shipments: any[];
  loading: boolean;
  isWmsActive: boolean;
}

export default function ShipmentsTab({ shipments, loading, isWmsActive }: ShipmentsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Truck className="w-5 h-5 text-violet-600" />
        Customer Shipments Dispatch Logs
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
          <p className="text-[10px] text-slate-500">Enable logistics shipments to dispatch customer inventory.</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading shipments...</div>
      ) : shipments.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No outbound shipments dispatched. Click 'Dispatch Shipment' to begin.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {shipments.map((s) => (
            <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
              <div>
                <strong className="font-mono text-cyan-700 block">{s.shipmentNumber}</strong>
                <span className="block mt-0.5 text-slate-650">Carrier: {s.carrier} ({s.trackingNumber})</span>
                <span className="block mt-1 text-[10px] text-slate-500">Sales Order: {s.salesOrder?.orderNumber} | Date: {new Date(s.shippedDate).toLocaleDateString()}</span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-50 border border-violet-200 text-violet-750 uppercase">
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
