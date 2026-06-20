"use client";

import React from "react";
import { BookOpen, Scale } from "lucide-react";

interface LedgerPostingsProps {
  ledger: any[];
  activeCurrency: string;
  activeLanguage: string;
  formatMoney: (val: number, curr?: string) => string;
}

export default function LedgerPostings({
  ledger,
  formatMoney,
}: LedgerPostingsProps) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-600" />
          General Ledger (UK HMRC Double-Entry)
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-cyan-50 border border-cyan-200 text-cyan-700 px-1.5 py-0.5 rounded uppercase">
          <Scale className="w-3 h-3" /> Balanced
        </span>
      </h3>

      <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 divide-y divide-slate-200">
        {ledger.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6">No journal entry postings recorded.</div>
        ) : (
          ledger.map((entry) => (
            <div key={entry.id} className="pt-4 first:pt-0 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">{entry.description}</span>
                <span className="font-mono text-slate-500">{entry.reference}</span>
              </div>
              
              {/* Ledger Lines */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {entry.lines.map((line: any) => (
                  <div key={line.id} className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500 w-1/3">Acc: {line.AccountCode}</span>
                    <span className="text-emerald-700 text-right w-1/3">
                      {line.debit > 0 ? `DR ${formatMoney(line.debit, "GBP")}` : ""}
                    </span>
                    <span className="text-violet-650 text-right w-1/3">
                      {line.credit > 0 ? `CR ${formatMoney(line.credit, "GBP")}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
