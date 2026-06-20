"use client";

import React from "react";
import { ClipboardCheck, Lock } from "lucide-react";

interface StockAuditsTabProps {
  isWmsActive: boolean;
  auditNotes: string;
  setAuditNotes: (val: string) => void;
  handleStartStockCheck: () => void;
}

export default function StockAuditsTab({
  isWmsActive,
  auditNotes,
  setAuditNotes,
  handleStartStockCheck,
}: StockAuditsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-violet-600" />
        Physical Audits & Stocktaking
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">Advanced WMS locked</h4>
          <p className="text-[10px] text-slate-500">Subscribe to WMS package to initialize physical audits.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-md">
          <p className="text-xs text-slate-600 leading-relaxed">Audits generate expected-stock worksheets dynamically for warehouse audits. Create a new sheet below:</p>
          <div className="space-y-3">
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="Audit description (e.g. Wall Shelf Aisle C Audit)"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 focus:bg-white text-slate-800"
            />
            <button
              onClick={handleStartStockCheck}
              className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              Generate Audit Count Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
