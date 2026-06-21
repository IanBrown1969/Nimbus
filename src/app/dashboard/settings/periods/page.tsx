"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Calendar, 
  Save, 
  Lock, 
  Unlock, 
  Plus, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sliders
} from "lucide-react";

interface AccountingPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

export default function PeriodsSettingsPage() {
  const { token, user } = useApp();

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Setup form states
  const [yearStart, setYearStart] = useState("2026-01-01");
  const [yearEnd, setYearEnd] = useState("2026-12-31");
  const [periodCount, setPeriodCount] = useState(12);

  useEffect(() => {
    if (token) {
      fetchPeriods();
    }
  }, [token]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/finance/periods", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPeriods(res.data);
    } catch (err) {
      console.error("Failed to load periods:", err);
      setMessage({ type: "error", text: "Failed to load current accounting periods." });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPeriods = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        yearStartDate: new Date(yearStart).toISOString(),
        yearEndDate: new Date(yearEnd).toISOString(),
        periodCount: Number(periodCount)
      };

      await axios.post("http://localhost:5000/api/finance/periods/setup", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: "success", text: "Accounting periods generated and saved successfully!" });
      fetchPeriods();
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Failed to set up accounting periods." 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (id: number, currentLockState: boolean) => {
    setMessage(null);
    try {
      const res = await axios.post(`http://localhost:5000/api/finance/periods/${id}/lock`, {
        isLocked: !currentLockState
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPeriods(prev => 
        prev.map(p => p.id === id ? { ...p, isLocked: !currentLockState } : p)
      );

      setMessage({ 
        type: "success", 
        text: `Period successfully ${!currentLockState ? "locked" : "unlocked"}!` 
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Failed to toggle period lock." 
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  if (user?.role !== "CompanyAdmin" && user?.role !== "GlobalAdmin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-10 max-w-md w-full text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight font-heading">
            Unauthorized Settings Access
          </h3>
          <p className="text-slate-550 text-xs mt-3 leading-relaxed">
            Only Company Administrators or Global Administrators can configure financial year accounting periods.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Administration</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Accounting Periods Setup</h2>
          <p className="text-slate-600 text-sm mt-1">Configure your financial year boundaries, divide the calendar into accounting periods, and lock/unlock periods.</p>
        </div>
        <button
          onClick={fetchPeriods}
          className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer active:scale-95 self-start md:self-auto shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          message.type === "success" 
            ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Setup Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm self-start space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Generate Financial Year</h3>
          </div>

          <form onSubmit={handleSetupPeriods} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Financial Year Start</label>
              <input
                type="date"
                required
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Financial Year End</label>
              <input
                type="date"
                required
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Number of Periods</label>
              <select
                value={periodCount}
                onChange={(e) => setPeriodCount(Number(e.target.value))}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-bold"
              >
                <option value={10}>10 Periods (Custom)</option>
                <option value={12}>12 Periods (Standard Monthly)</option>
                <option value={13}>13 Periods (4-Week Cycle)</option>
                <option value={24}>24 Periods (Bi-Monthly)</option>
              </select>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10px] leading-relaxed">
              <span className="font-bold block mb-0.5">⚠️ Caution: Overwrite Warning</span>
              Generating a new set of periods will overwrite all existing unlocked periods in this range. Locked periods cannot be modified or replaced.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              <span>{saving ? "Generating..." : "Generate Accounting Year"}</span>
            </button>
          </form>
        </div>

        {/* Existing Periods Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              Configured Accounting Periods
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Locked periods block ledger posts</span>
          </div>

          {loading ? (
            <div className="text-slate-500 text-xs text-center py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
              <span>Fetching periods...</span>
            </div>
          ) : periods.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-20 italic">
              No financial accounting periods configured yet. Use the setup tool on the left to generate them.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/40">
                    <th className="py-3 px-5">Period name</th>
                    <th className="py-3 px-5">Start Date</th>
                    <th className="py-3 px-5">End Date</th>
                    <th className="py-3 px-5 text-center">Locked status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">{period.name}</td>
                      <td className="py-3.5 px-5 font-mono">{formatDate(period.startDate)}</td>
                      <td className="py-3.5 px-5 font-mono">{formatDate(period.endDate)}</td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => handleToggleLock(period.id, period.isLocked)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            period.isLocked 
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" 
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {period.isLocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
