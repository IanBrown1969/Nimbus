"use client";

import React from "react";
import { Download, Lock } from "lucide-react";

interface GoodsInTabProps {
  deliveries: any[];
  loading: boolean;
  isWmsActive: boolean;
}

export default function GoodsInTab({ deliveries, loading, isWmsActive }: GoodsInTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Download className="w-5 h-5 text-violet-600" />
        Goods Received Notes (Incoming Deliveries)
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
          <p className="text-[10px] text-slate-500">Record incoming PO catalog items and update bin coordinates.</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading deliveries...</div>
      ) : deliveries.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No incoming deliveries received. Click 'Receive Delivery' to begin.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {deliveries.map((d) => (
            <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
              <div>
                <strong className="font-mono text-cyan-700 block">{d.deliveryNumber}</strong>
                <span className="block mt-0.5 text-slate-600">PO Ref: {d.purchaseOrder?.orderNumber}</span>
                <span className="block mt-1 text-[10px] text-slate-500">Date: {new Date(d.deliveryDate).toLocaleDateString()} by {d.receivedByUser?.username}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Stored Bins</span>
                {d.lines.map((line: any) => (
                  <span key={line.id} className="block font-mono text-[10px] text-violet-650 mt-0.5">
                    {line.stockItem?.sku}: {line.quantityDelivered} units in Bin {line.binLocation?.code || "Default"}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
