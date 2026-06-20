"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Building, 
  Puzzle, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Languages, 
  DollarSign, 
  PackageSearch 
} from "lucide-react";

export default function DashboardOverview() {
  const { token, user, activeLanguage, activeCurrency, plugins, setLanguage } = useApp();

  const [skusCount, setSkusCount] = useState(0);
  const [ledgerBalanced, setLedgerBalanced] = useState<boolean | null>(null);
  const [activeSubCount, setActiveSubCount] = useState(0);
  const [invoiceSum, setInvoiceSum] = useState(0.0);

  useEffect(() => {
    if (token) {
      fetchOverviewData();
    }
  }, [token, plugins]);

  const fetchOverviewData = async () => {
    try {
      // 1. Get stock count
      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkusCount(stockRes.data.length);

      // 2. Count active plugins
      const activeSubs = plugins.filter(p => p.isSubscribed).length;
      setActiveSubCount(activeSubs);

      // 3. Get Invoice Sum and double-entry General Ledger balancing checks
      const invoiceRes = await axios.get("http://localhost:5000/api/finance/invoices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invoices = invoiceRes.data;
      const sum = invoices.reduce((acc: number, inv: any) => acc + inv.totalGross, 0);
      setInvoiceSum(sum);

      const ledgerRes = await axios.get("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const entries = ledgerRes.data;
      
      let allBalanced = true;
      if (entries.length > 0) {
        for (const entry of entries) {
          const debits = entry.lines.reduce((acc: number, l: any) => acc + l.debit, 0);
          const credits = entry.lines.reduce((acc: number, l: any) => acc + l.credit, 0);
          if (Math.abs(debits - credits) > 0.01) {
            allBalanced = false;
            break;
          }
        }
      }
      setLedgerBalanced(entries.length > 0 ? allBalanced : true);

    } catch (err) {
      console.error("Failed to load overview metrics:", err);
    }
  };

  // Locale language switch options
  const languages = [
    { code: "en-GB", label: "British English (GBP)" },
    { code: "fr-FR", label: "French (EUR)" }
  ];

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency
    }).format(val);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(activeLanguage, {
      dateStyle: "full",
      timeStyle: "short"
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest font-heading">Welcome Back</span>
          <h2 className="text-2xl font-bold font-heading text-slate-800 mt-1">{user?.username}</h2>
          <p className="text-slate-500 text-xs mt-1">Logged into {user?.tenantName} dashboard console.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs shadow-sm">
          <Building className="w-4 h-4 text-violet-600" />
          <span>Tenant Domain: <strong>{user?.tenantId ? String(user.tenantId).substring(0,8) : "N/A"}</strong></span>
        </div>
      </div>

      {/* Interactive Localization Panel */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-cyan-600" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Active Localization Context</h4>
            <p className="text-[10px] text-slate-500">Dates, currency rates, and labels adjust dynamically based on this selection.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeLanguage === lang.code
                  ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SKUs */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock SKUs</span>
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <PackageSearch className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{skusCount}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Catalog items defined</span>
          </div>
        </div>

        {/* Invoice Total */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Billings</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{formatMoney(invoiceSum)}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Total invoiced sales</span>
          </div>
        </div>

        {/* Subscribed Plugins */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add-on Modules</span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <Puzzle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{activeSubCount} / 3</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Paid plugins subscribed</span>
          </div>
        </div>

        {/* General Ledger Balancing Check */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UK Ledger Audit</span>
            {ledgerBalanced === true ? (
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            ) : (
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600 animate-bounce">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-850">
              {ledgerBalanced === true ? "Debit = Credit" : (ledgerBalanced === false ? "Unbalanced!" : "No Entries")}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-1">
              {ledgerBalanced === true ? "HMRC double-entry compliant" : "Compliance warning!"}
            </span>
          </div>
        </div>
      </div>

      {/* Date Display */}
      <div className="text-right text-[10px] text-slate-500">
        System Date: {formatDate(new Date())}
      </div>
    </div>
  );
}
