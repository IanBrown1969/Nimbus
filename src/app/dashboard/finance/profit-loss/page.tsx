"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Calendar,
  Percent,
  Download
} from "lucide-react";

interface AccountDetail {
  accountCode: string;
  name: string;
  balance: number;
}

interface ProfitLossData {
  revenueDetails: AccountDetail[];
  expenseDetails: AccountDetail[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export default function ProfitLossPage() {
  const { token, activeLanguage, activeCurrency } = useApp();
  
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState("Current Fiscal Year");

  useEffect(() => {
    if (token) {
      fetchReport();
    }
  }, [token]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/finance/reports/profit-loss", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load Profit & Loss report.");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency || "GBP"
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link 
            href="/dashboard/finance" 
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-650 transition-colors font-medium mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Ledger
          </Link>
          <span className="text-xs font-bold text-violet-655 uppercase tracking-widest font-heading block">Accounting & Financials</span>
          <h2 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Profit & Loss Statement</h2>
          <p className="text-slate-500 text-xs mt-0.5">Formal ledger-derived income statement detailing revenue, expense accounts, and net profit margins.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={reportPeriod} 
              onChange={(e) => setReportPeriod(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-semibold text-xs cursor-pointer outline-none"
            >
              <option value="Current Fiscal Year">Current Fiscal Year</option>
              <option value="Q1 Actuals">Q1 Actuals</option>
              <option value="Q2 Actuals">Q2/Year-to-date</option>
              <option value="Trailing 12 Months">Trailing 12 Months</option>
            </select>
          </div>

          <button
            onClick={fetchReport}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.print()}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer shadow-md shadow-slate-900/10"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-24 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <span className="font-semibold text-slate-600">Generating report tables...</span>
        </div>
      ) : data ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Revenue */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <span>Revenue (Turnover)</span>
                <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-2xl font-extrabold text-slate-800 font-mono">
                  {formatMoney(data.totalRevenue)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-1">100% of gross inflow</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <span>Total Operating Expenses</span>
                <span className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className="block text-2xl font-extrabold text-slate-800 font-mono">
                  {formatMoney(data.totalExpenses)}
                </span>
                <span className="text-[10px] text-slate-550 font-semibold block mt-1">
                  {data.totalRevenue > 0 
                    ? `${((data.totalExpenses / data.totalRevenue) * 100).toFixed(1)}% of revenue`
                    : "0.0% of revenue"}
                </span>
              </div>
            </div>

            {/* Net Profit */}
            <div className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px] ${
              data.netProfit >= 0 
                ? "bg-gradient-to-br from-violet-50/50 to-indigo-50/30 border-violet-200/60" 
                : "bg-gradient-to-br from-rose-50/50 to-rose-100/30 border-rose-200/60"
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <span className={data.netProfit >= 0 ? "text-violet-750" : "text-rose-750"}>Net Profit Margin</span>
                <span className={`p-1 rounded-lg border ${
                  data.netProfit >= 0 
                    ? "bg-violet-100 border-violet-200 text-violet-700" 
                    : "bg-rose-100 border-rose-200 text-rose-700"
                }`}>
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className={`block text-2xl font-black font-mono tracking-tight ${
                  data.netProfit >= 0 ? "text-violet-750" : "text-rose-750"
                }`}>
                  {formatMoney(data.netProfit)}
                </span>
                <span className={`text-[10px] font-bold block mt-1 ${
                  data.netProfit >= 0 ? "text-violet-650" : "text-rose-655"
                }`}>
                  {data.totalRevenue > 0 
                    ? `${((data.netProfit / data.totalRevenue) * 100).toFixed(1)}% net margin`
                    : "0.0% net margin"}
                </span>
              </div>
            </div>
          </div>

          {/* Statement Sheets */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
                Statement Ledger Details ({reportPeriod})
              </span>
              <span className="text-[10px] text-slate-550 font-medium">All figures in base tenant currency ({activeCurrency})</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              
              {/* --- REVENUE SECTION --- */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-2">
                  <span className="uppercase tracking-wider font-heading text-[10px] text-slate-500">I. Revenue Accounts</span>
                  <span className="font-mono">{formatMoney(data.totalRevenue)}</span>
                </div>
                
                {data.revenueDetails.length === 0 ? (
                  <span className="block text-slate-400 italic py-2">No revenue posted to general ledger.</span>
                ) : (
                  <div className="space-y-3.5 pl-3">
                    {data.revenueDetails.map((rev) => (
                      <div key={rev.accountCode} className="flex justify-between items-center text-slate-755 hover:text-slate-900">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-slate-450 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{rev.accountCode}</span>
                          <span className="font-medium">{rev.name}</span>
                        </div>
                        <span className="font-mono text-slate-700 font-semibold">{formatMoney(rev.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- EXPENSES SECTION --- */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between font-bold text-slate-800 text-xs border-b border-slate-200/80 pb-2">
                  <span className="uppercase tracking-wider font-heading text-[10px] text-slate-500">II. Operating Expenses</span>
                  <span className="font-mono text-amber-700">({formatMoney(data.totalExpenses)})</span>
                </div>

                {data.expenseDetails.length === 0 ? (
                  <span className="block text-slate-400 italic py-2">No operating expenses posted to general ledger.</span>
                ) : (
                  <div className="space-y-3.5 pl-3">
                    {data.expenseDetails.map((exp) => (
                      <div key={exp.accountCode} className="flex justify-between items-center text-slate-755 hover:text-slate-900">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-slate-450 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{exp.accountCode}</span>
                          <span className="font-medium">{exp.name}</span>
                        </div>
                        <span className="font-mono text-slate-650">({formatMoney(exp.balance)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- NET POSITION SUMMARY --- */}
              <div className="p-6 bg-slate-50/70 flex justify-between items-center border-t border-slate-200">
                <div className="space-y-1">
                  <span className="block text-xs font-black text-slate-800 uppercase tracking-wider font-heading">
                    Net Income / Position (I - II)
                  </span>
                  <span className="block text-[10px] text-slate-500 font-medium">Accumulates directly to Balance Sheet Net Equity values.</span>
                </div>
                <div className="text-right">
                  <span className={`block text-xl font-black font-mono tracking-tight ${
                    data.netProfit >= 0 ? "text-violet-750" : "text-rose-750"
                  }`}>
                    {formatMoney(data.netProfit)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div className="text-slate-500 text-xs text-center py-10 bg-white border border-slate-200 rounded-3xl">
          No Profit & Loss data available.
        </div>
      )}
    </div>
  );
}
