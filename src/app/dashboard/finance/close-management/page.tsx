"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  Lock, 
  Unlock, 
  CheckCircle, 
  HelpCircle, 
  TrendingUp, 
  ArrowRight, 
  Play, 
  AlertCircle,
  FileCheck,
  UserCheck,
  RefreshCw
} from "lucide-react";

interface FiscalPeriod {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  status: "open" | "closed" | "locked";
  closedBy: string | null;
  closedAt: string | null;
}

export default function CloseManagementPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([
    { code: "2026-M01", name: "January 2026", startDate: "2026-01-01", endDate: "2026-01-31", isLocked: true, status: "locked", closedBy: "System Administrator", closedAt: "2026-02-05" },
    { code: "2026-M02", name: "February 2026", startDate: "2026-02-01", endDate: "2026-02-28", isLocked: true, status: "locked", closedBy: "System Administrator", closedAt: "2026-03-04" },
    { code: "2026-M03", name: "March 2026", startDate: "2026-03-01", endDate: "2026-03-31", isLocked: true, status: "locked", closedBy: "Ian Brown (Controller)", closedAt: "2026-04-06" },
    { code: "2026-M04", name: "April 2026", startDate: "2026-04-01", endDate: "2026-04-30", isLocked: true, status: "locked", closedBy: "Ian Brown (Controller)", closedAt: "2026-05-04" },
    { code: "2026-M05", name: "May 2026", startDate: "2026-05-01", endDate: "2026-05-31", isLocked: false, status: "closed", closedBy: "Ian Brown (Controller)", closedAt: "2026-06-05" },
    { code: "2026-M06", name: "June 2026", startDate: "2026-06-01", endDate: "2026-06-30", isLocked: false, status: "open", closedBy: null, closedAt: null }
  ]);

  const [activePeriodCode, setActivePeriodCode] = useState("2026-M05");
  const [isRevaluing, setIsRevaluing] = useState(false);
  const [revalueComplete, setRevalueComplete] = useState(false);
  const [signOffComplete, setSignOffComplete] = useState(false);

  // Close list checks
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Verify and reconcile all bank accounts", done: true },
    { id: 2, text: "Post Fixed Asset depreciation schedules", done: true },
    { id: 3, text: "Import and allocate foreign exchange rates", done: false },
    { id: 4, text: "Verify accounts receivable balances & outstanding credits", done: true },
    { id: 5, text: "Verify supplier invoice ledger matching & accruals", done: false },
    { id: 6, text: "Reconcile VAT/HMRC returns accounts", done: true }
  ]);

  const toggleLock = (code: string) => {
    setPeriods(prev => prev.map(p => {
      if (p.code === code) {
        const nextLocked = !p.isLocked;
        return {
          ...p,
          isLocked: nextLocked,
          status: nextLocked ? "locked" : "closed"
        };
      }
      return p;
    }));
  };

  const handleToggleCheck = (id: number) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, done: !item.done };
      }
      return item;
    }));
  };

  const runReval = () => {
    setIsRevaluing(true);
    setTimeout(() => {
      setIsRevaluing(false);
      setRevalueComplete(true);
      setChecklist(prev => prev.map(item => item.id === 3 ? { ...item, done: true } : item));
    }, 2000);
  };

  const submitSignOff = () => {
    setSignOffComplete(true);
    setChecklist(prev => prev.map(item => item.id === 5 ? { ...item, done: true } : item));
    setPeriods(prev => prev.map(p => {
      if (p.code === "2026-M05") {
        return {
          ...p,
          status: "closed",
          closedBy: "Ian Brown (Controller)",
          closedAt: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    }));
  };

  const activePeriod = periods.find(p => p.code === activePeriodCode) || periods[4];
  const pendingTasks = checklist.filter(item => !item.done).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Ledger & Control</span>
        <h2 className="text-3xl font-bold font-heading text-slate-900">Accounting Period Close</h2>
        <p className="text-slate-655 text-sm mt-1">Lock accounting periods, run currency adjustments, and sign-off monthly and annual corporate ledgers.</p>
      </div>

      {/* Fiscal Timeline */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fiscal Periods Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">Click a period to view its close checklist and security lockdown status.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {periods.map((p) => {
            const isActive = p.code === activePeriodCode;
            return (
              <button 
                key={p.code}
                onClick={() => {
                  setActivePeriodCode(p.code);
                  if (p.code !== "2026-M05") {
                    setSignOffComplete(false);
                    setRevalueComplete(false);
                  }
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                  isActive 
                    ? "border-violet-300 bg-violet-50/20 ring-1 ring-violet-100 shadow-md shadow-violet-100/40" 
                    : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 bg-white"
                }`}
              >
                <div>
                  <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">{p.code}</span>
                  <strong className="block text-xs text-slate-800 mt-2 font-heading leading-tight">{p.name}</strong>
                </div>

                <div className="flex items-center gap-1.5 mt-4">
                  {p.isLocked ? (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 border border-slate-250 text-slate-600 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-500" /> Locked
                    </span>
                  ) : p.status === "closed" ? (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-50 border border-emerald-250 text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> Closed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-sky-50 border border-sky-250 text-sky-700 flex items-center gap-1 animate-pulse">
                      <Unlock className="w-2.5 h-2.5 text-sky-500" /> Open
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Closing Control panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Close Checklist Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-650" />
                  Checklist for {activePeriod.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Complete all prerequisite tasks to execute fiscal sign-off.</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => toggleLock(activePeriod.code)}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    activePeriod.isLocked 
                      ? "border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 text-rose-700" 
                      : "border-slate-250 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {activePeriod.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Unlock Period
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-slate-500" /> Lock Accounting Period
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Checklist items */}
            <div className="divide-y divide-slate-150">
              {checklist.map((item) => (
                <div key={item.id} className="py-4 flex items-start gap-4 transition-all hover:bg-slate-50/50 rounded-xl px-2">
                  <button 
                    onClick={() => handleToggleCheck(item.id)}
                    className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                      item.done 
                        ? "bg-violet-600 border-violet-600 text-white" 
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}
                  >
                    {item.done && <CheckCircle className="w-3 h-3 text-white fill-violet-600" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-xs font-medium block ${item.done ? "text-slate-500 line-through" : "text-slate-800"}`}>
                      {item.text}
                    </span>
                    <span className="block text-[9px] mt-1 text-slate-400">
                      {item.done ? "Verification complete • System validated" : "Required step before audit clearance"}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                    item.done 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                      : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}>
                    {item.done ? "Done" : "Pending"}
                  </span>
                </div>
              ))}
            </div>

            {/* Reconciliation and Adjustments Action area */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-violet-650" />
                  Foreign Currency Revaluation
                </h4>
                <p className="text-[10px] text-slate-505 leading-relaxed">
                  Automatically pull HMRC exchange rates and adjust your foreign bank and ledger balances to post unrealised currency gains/losses.
                </p>
              </div>
              <button 
                onClick={runReval}
                disabled={isRevaluing || revalueComplete}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isRevaluing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Revaluing...
                  </>
                ) : revalueComplete ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Revalued
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" /> Run Revaluation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Closing Control Panel (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Close Accounting Ledger</h3>
              <p className="text-[11px] text-slate-505 mt-1">Submit sign-off credentials to mark this month as historically locked for compliance audits.</p>
            </div>

            {/* Status alerts */}
            {pendingTasks > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="block font-bold">Unfinished Tasks ({pendingTasks})</span>
                  <span className="block text-amber-700 mt-1">Please mark all closing checks as complete before performing sign-off.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block font-bold">Ledger Pre-check Clear!</span>
                  <span className="block text-emerald-700 mt-1">All standard reconciliations have passed validation. Ready for CFO sign-off.</span>
                </div>
              </div>
            )}

            {/* Signature sign off */}
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block">Close Controller Name</label>
                <input 
                  type="text" 
                  disabled
                  value="Ian Brown (Controller)" 
                  className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block">Close Notes / Audit Memo</label>
                <textarea 
                  placeholder="e.g. Completed inventory count sheets and reconciled barclays accounts. No material variances."
                  className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-violet-500 h-20"
                ></textarea>
              </div>

              {signOffComplete ? (
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-150 text-violet-850 text-center text-xs space-y-2 animate-in zoom-in-95 duration-200">
                  <UserCheck className="w-6 h-6 text-violet-650 mx-auto" />
                  <div>
                    <span className="block font-bold">Sign-off Logged</span>
                    <span className="block text-[10px] text-violet-505 mt-1">Ian Brown signed off 2026-M05 close on {new Date().toISOString().split('T')[0]}.</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={submitSignOff}
                  disabled={pendingTasks > 0}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-550 hover:to-indigo-550 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-500/10 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" /> Sign-off & Close Ledger
                </button>
              )}
            </div>

            {/* Audit log trail */}
            {activePeriod.closedBy && (
              <div className="border-t border-slate-150 pt-5 space-y-3.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Close Sign-off Audit Trail</span>
                <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span>Authorized Signature</span>
                    <span className="text-violet-650">Sign-off Verified</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    <span className="block">User: {activePeriod.closedBy}</span>
                    <span className="block mt-0.5">Date: {activePeriod.closedAt}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
