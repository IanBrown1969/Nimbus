"use client";

import React from "react";
import { AlertTriangle, Lock } from "lucide-react";

interface AdjustmentsTabProps {
  adjustments: any[];
  loading: boolean;
  isWmsActive: boolean;
}

export default function AdjustmentsTab({ adjustments, loading, isWmsActive }: AdjustmentsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-violet-600" />
        Manual Stock Adjustment Audit Logs
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
          <p className="text-[10px] text-slate-500">Record stock write-offs and audits directly inside adjustments.</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading adjustments...</div>
      ) : adjustments.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No manual stock adjustments recorded. Click 'Post Stock Adjustment' to write one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product SKU</th>
                <th className="py-3 px-4">Bin Location</th>
                <th className="py-3 px-4 text-right">Adjustment Qty</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {adjustments.map((adj) => (
                <tr key={adj.id} className="hover:bg-slate-50 text-slate-700">
                  <td className="py-3 px-4">{new Date(adj.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-mono font-bold text-violet-650">{adj.stockItem?.sku}</td>
                  <td className="py-3 px-4 font-mono text-cyan-700">{adj.binLocation?.code || "Default"}</td>
                  <td className={`py-3 px-4 text-right font-bold ${adj.quantityChanged > 0 ? "text-emerald-600" : "text-rose-650"}`}>
                    {adj.quantityChanged > 0 ? `+${adj.quantityChanged}` : adj.quantityChanged}
                  </td>
                  <td className="py-3 px-4 text-slate-650">{adj.reason}</td>
                  <td className="py-3 px-4 text-slate-505">{adj.user?.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
