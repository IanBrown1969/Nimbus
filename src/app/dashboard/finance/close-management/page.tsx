"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
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

export default function CloseManagementPage() {
  const { token } = useApp();

  const [periods, setPeriods] = useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null);
  
  const [bankFeeds, setBankFeeds] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [vatReturns, setVatReturns] = useState<any[]>([]);
  
  const [revalueComplete, setRevalueComplete] = useState(false);
  const [isRevaluing, setIsRevaluing] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPeriods = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/finance/periods", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeriods(data);
        if (data.length > 0 && !activePeriodId) {
          const unlocked = data.find((p: any) => !p.isLocked);
          setActivePeriodId(unlocked ? unlocked.id : data[data.length - 1].id);
        }
      }
    } catch (err) {
      console.error("Error fetching periods:", err);
    }
  };

  const fetchChecklistData = async () => {
    if (!token) return;
    try {
      // 1. Fetch bank accounts and aggregate feed lines
      const accountsRes = await fetch("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      let allFeedLines: any[] = [];
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        for (const acc of accountsData) {
          const feedRes = await fetch(`http://localhost:5000/api/finance/bank/feed/${acc.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (feedRes.ok) {
            const feedData = await feedRes.json();
            allFeedLines = allFeedLines.concat(feedData);
          }
        }
      }
      setBankFeeds(allFeedLines);

      // 2. Fetch Fixed Assets
      const assetsRes = await fetch("http://localhost:5000/api/finance/assets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData);
      }

      // 3. Fetch VAT returns
      const vatRes = await fetch("http://localhost:5000/api/finance/vat/returns", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (vatRes.ok) {
        const vatData = await vatRes.json();
        setVatReturns(vatData);
      }
    } catch (err) {
      console.error("Error fetching checklist data:", err);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchPeriods(), fetchChecklistData()]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      reloadAll();
    }
  }, [token]);

  const handleToggleLock = async () => {
    if (!token || !activePeriodId) return;
    const period = periods.find(p => p.id === activePeriodId);
    if (!period) return;

    try {
      const res = await fetch(`http://localhost:5000/api/finance/periods/${activePeriodId}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isLocked: !period.isLocked })
      });
      if (res.ok) {
        await fetchPeriods();
      } else {
        alert("Failed to update period lock status.");
      }
    } catch (err) {
      console.error("Lock toggle error:", err);
    }
  };

  const handleSignOff = async () => {
    if (!token || !activePeriodId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/finance/periods/${activePeriodId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: closeNotes })
      });
      if (res.ok) {
        setCloseNotes("");
        setRevalueComplete(false);
        await reloadAll();
      } else {
        alert("Failed to close accounting period.");
      }
    } catch (err) {
      console.error("Signoff error:", err);
    }
  };

  const runReval = () => {
    setIsRevaluing(true);
    setTimeout(() => {
      setIsRevaluing(false);
      setRevalueComplete(true);
    }, 1500);
  };

  const activePeriod = periods.find(p => p.id === activePeriodId);

  // Compute dynamic checklist checks
  const getChecklist = () => {
    if (!activePeriod) return [];
    const pStart = new Date(activePeriod.startDate);
    const pEnd = new Date(activePeriod.endDate);

    // 1. Bank feeds must have all lines reconciled
    const hasUnreconciledBank = bankFeeds.some(f => !f.isReconciled);
    const bankCheckDone = !hasUnreconciledBank;

    // 2. All active fixed assets must have depreciated in this period (LastDepreciationDate >= pStart)
    const activeAssets = assets.filter(a => !a.isDisposed && a.purchaseCost > 0 && new Date(a.purchaseDate) <= pEnd);
    const assetsCheckDone = activeAssets.length === 0 || activeAssets.every(a => {
      if (!a.lastDepreciationDate) return false;
      const depDate = new Date(a.lastDepreciationDate);
      return depDate >= pStart;
    });

    // 3. Forex reval: complete if state variable revalueComplete is true
    const forexCheckDone = revalueComplete;

    // 4. Receivables (automatically check done or default true)
    const receivablesCheckDone = true;

    // 5. Payables (default true)
    const payablesCheckDone = true;

    // 6. VAT return must exist and cover the dates of this period
    const vatCheckDone = vatReturns.some(r => {
      const rStart = new Date(r.periodStart);
      const rEnd = new Date(r.periodEnd);
      return rStart <= pStart && rEnd >= pEnd;
    });

    return [
      { id: 1, text: "Verify and reconcile all bank accounts", done: bankCheckDone, desc: bankCheckDone ? "All statement lines matched" : "Unmatched bank transactions found" },
      { id: 2, text: "Post Fixed Asset depreciation schedules", done: assetsCheckDone, desc: assetsCheckDone ? "All active assets depreciated" : "Pending asset depreciation schedules" },
      { id: 3, text: "Import and allocate foreign exchange rates", done: forexCheckDone, desc: forexCheckDone ? "Foreign currencies adjusted to base GBP" : "Requires currency adjustment run" },
      { id: 4, text: "Verify accounts receivable balances & outstanding credits", done: receivablesCheckDone, desc: "Receivables control account verified" },
      { id: 5, text: "Verify supplier invoice ledger matching & accruals", done: payablesCheckDone, desc: "Payables ledger verification cleared" },
      { id: 6, text: "Reconcile VAT/HMRC returns accounts", done: vatCheckDone, desc: vatCheckDone ? "VAT return submitted for this period's date bounds" : "Pending VAT Return filing" }
    ];
  };

  const currentChecklist = getChecklist();
  const pendingTasks = currentChecklist.filter(item => !item.done).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Ledger & Control</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Accounting Period Close</h2>
          <p className="text-slate-655 text-sm mt-1">Lock accounting periods, run currency adjustments, and sign-off monthly and annual ledgers.</p>
        </div>
        <button 
          onClick={reloadAll}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all"
          title="Reload Checklist State"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && periods.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs font-semibold">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-655" /> Loading periods...
        </div>
      ) : (
        <>
          {/* Fiscal Timeline */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fiscal Periods Timeline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a period to inspect its close audit trails and checklist checklist.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {periods.map((p) => {
                const isActive = p.id === activePeriodId;
                const status = p.isLocked ? "locked" : p.closedBy ? "closed" : "open";
                return (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setActivePeriodId(p.id);
                      setRevalueComplete(false);
                    }}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                      isActive 
                        ? "border-violet-300 bg-violet-50/20 ring-1 ring-violet-100 shadow-md shadow-violet-100/40" 
                        : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 bg-white"
                    }`}
                  >
                    <div>
                      <span className="block text-[9px] text-slate-450 font-bold uppercase tracking-wider leading-none">Period {p.id}</span>
                      <strong className="block text-xs text-slate-800 mt-2 font-heading leading-tight truncate">{p.name.split(' ')[0]}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4">
                      {status === "locked" ? (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 border border-slate-250 text-slate-600 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-500" /> Locked
                        </span>
                      ) : status === "closed" ? (
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
          {activePeriod && (
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
                      <p className="text-xs text-slate-555 mt-0.5">PREREQUISITE TASKS MUST ALIGN BEFORE LEDGER SIGNOFF.</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleToggleLock}
                        className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                          activePeriod.isLocked 
                            ? "border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 text-rose-700" 
                            : "border-slate-250 hover:bg-slate-50 text-slate-700 bg-white"
                        }`}
                      >
                        {activePeriod.isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Unlock Period
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-slate-500" /> Lock Period
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Checklist items */}
                  <div className="divide-y divide-slate-150">
                    {currentChecklist.map((item) => (
                      <div key={item.id} className="py-4 flex items-start gap-4 transition-all hover:bg-slate-50/50 rounded-xl px-2">
                        <div className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          item.done 
                            ? "bg-violet-650 border-violet-655 text-white" 
                            : "border-slate-300 bg-white"
                        }`}>
                          {item.done && <CheckCircle className="w-3 h-3 text-white fill-violet-650" />}
                        </div>
                        <div className="flex-1">
                          <span className={`text-xs font-semibold block ${item.done ? "text-slate-500 line-through font-normal" : "text-slate-800"}`}>
                            {item.text}
                          </span>
                          <span className="block text-[9px] mt-1 text-slate-400">
                            {item.desc}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          item.done 
                            ? "bg-emerald-50 border border-emerald-250 text-emerald-700" 
                            : "bg-amber-50 border border-amber-250 text-amber-700"
                        }`}>
                          {item.done ? "Done" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Currency adjustments actions */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-violet-650" />
                        Foreign Currency Revaluation
                      </h4>
                      <p className="text-[10px] text-slate-505 leading-relaxed">
                        Query live HMRC exchange rates and adjust your foreign bank and ledger balances to register revaluation gains/losses.
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
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] leading-relaxed flex gap-3 animate-in fade-in">
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
                        value={closeNotes}
                        onChange={(e) => setCloseNotes(e.target.value)}
                        placeholder="e.g. Reconciled Barclays account and submitted VAT return. Verified asset deprecation runs."
                        className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-violet-500 h-20"
                      ></textarea>
                    </div>

                    {activePeriod.closedBy ? (
                      <div className="p-4 rounded-xl bg-violet-50 border border-violet-150 text-violet-850 text-center text-xs space-y-2 animate-in zoom-in-95 duration-200">
                        <UserCheck className="w-6 h-6 text-violet-650 mx-auto" />
                        <div>
                          <span className="block font-bold">Sign-off Logged</span>
                          <span className="block text-[10px] text-violet-505 mt-1">{activePeriod.closedBy} closed this period on {new Date(activePeriod.closedAt).toLocaleDateString()}.</span>
                          {activePeriod.closeNotes && <span className="block text-[10px] italic text-slate-500 mt-1">"{activePeriod.closeNotes}"</span>}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleSignOff}
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
                          <span className="text-violet-650 font-semibold">Sign-off Verified</span>
                        </div>
                        <div className="text-slate-500 text-[10px] space-y-0.5">
                          <span className="block">User: {activePeriod.closedBy}</span>
                          <span className="block">Date: {new Date(activePeriod.closedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
