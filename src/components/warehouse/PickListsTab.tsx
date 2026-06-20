"use client";

import React from "react";
import { FileText, Lock, CheckCircle } from "lucide-react";

interface PickListsTabProps {
  pickLists: any[];
  loading: boolean;
  isWmsActive: boolean;
  onProcessPick: (pl: any) => void;
}

export default function PickListsTab({
  pickLists,
  loading,
  isWmsActive,
  onProcessPick,
}: PickListsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <FileText className="w-5 h-5 text-violet-600" />
        Outstanding Warehouse Pick Sheets
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
          <p className="text-[10px] text-slate-500">Complete sales order picking and logistics tracking inside WMS.</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading picking sheets...</div>
      ) : pickLists.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No picking sheets created. Approve a Sales Order to generate one.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pickLists.map((pl) => (
            <div key={pl.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-350 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-cyan-700 text-sm">{pl.pickListNumber}</strong>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${pl.isCompleted ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                    {pl.isCompleted ? "Picked" : "Ready"}
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
                  <span>Sales Ref: <strong className="text-slate-700">{pl.salesOrder?.orderNumber}</strong></span>
                  <span>Generated: <strong className="text-slate-700">{new Date(pl.createdDate).toLocaleDateString()}</strong></span>
                  {pl.isCompleted && (
                    <span>Completed by: <strong className="text-slate-700">{pl.completedByUser?.username}</strong></span>
                  )}
                </div>
              </div>
              <div>
                {!pl.isCompleted ? (
                  <button
                    onClick={() => onProcessPick(pl)}
                    className="py-1 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Process Pick
                  </button>
                ) : (
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 text-[10px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Picks Verified</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
