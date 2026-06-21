"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  UploadCloud, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  X, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

interface PendingTransaction {
  id: string;
  date: string;
  description: string;
  type: "credit" | "debit";
  amount: number;
  erpSuggestion: {
    reference: string;
    similarity: number;
    amountMatch: boolean;
    dateMatch: boolean;
  } | null;
}

export default function AccountReconciliationPage() {
  const [reconciledCount, setReconciledCount] = useState(138);
  const [pendingCount, setPendingCount] = useState(4);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([
    {
      id: "TX-9908",
      date: "2026-06-20",
      description: "CHG* STRIPE PAYMENT RECEIVED",
      type: "credit",
      amount: 450.00,
      erpSuggestion: {
        reference: "Sales Invoice #INV-2026-1049 (John & Builders)",
        similarity: 98,
        amountMatch: true,
        dateMatch: true
      }
    },
    {
      id: "TX-9909",
      date: "2026-06-19",
      description: "HMRC VAT PAYMENT DD",
      type: "debit",
      amount: 1250.00,
      erpSuggestion: {
        reference: "VAT Return Liability (Q1 2026)",
        similarity: 95,
        amountMatch: true,
        dateMatch: true
      }
    },
    {
      id: "TX-9910",
      date: "2026-06-18",
      description: "AMAZON UK MARKETPLACE RETAIL",
      type: "debit",
      amount: 89.99,
      erpSuggestion: {
        reference: "Expense Claim #EXP-4022 (Stationery)",
        similarity: 88,
        amountMatch: true,
        dateMatch: false
      }
    },
    {
      id: "TX-9911",
      date: "2026-06-17",
      description: "DIRECT CREDIT 488209 ACME CORP",
      type: "credit",
      amount: 3200.00,
      erpSuggestion: {
        reference: "Sales Order #SO-0043 (Acme Holdings)",
        similarity: 78,
        amountMatch: false,
        dateMatch: true
      }
    }
  ]);

  const handleMatch = (id: string) => {
    setPendingTransactions(prev => prev.filter(tx => tx.id !== id));
    setReconciledCount(prev => prev + 1);
    setPendingCount(prev => prev - 1);
  };

  const handleRejectMatch = (id: string) => {
    setPendingTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        return { ...tx, erpSuggestion: null };
      }
      return tx;
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsImporting(true);
      setTimeout(() => {
        setIsImporting(false);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 4000);
      }, 1500);
    }
  };

  const filteredTx = pendingTransactions.filter(tx => 
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTransactions = reconciledCount + pendingCount;
  const matchRate = totalTransactions > 0 ? ((reconciledCount / totalTransactions) * 100).toFixed(1) : "100.0";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Banking & Cash</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900 flex items-center gap-2">
            Account Reconciliation
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 border border-violet-250 text-violet-750 uppercase tracking-wider">
              Live Connection
            </span>
          </h2>
          <p className="text-slate-600 text-sm mt-1">Match statement lines imported from your bank feeds directly with Nimbus general ledger entries.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statement Match Rate</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{matchRate}%</span>
            <span className="text-xs text-emerald-600 font-semibold">+{reconciledCount} matched</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${matchRate}%` }}></div>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Match Rules</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-semibold">Review required</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-4">AI engine generated auto-suggestions.</p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Feed Balance</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£142,508.20</span>
            <span className="block text-[10px] text-slate-450 mt-1">Last statement imported 2 hours ago</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Bank feed fully reconciled
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ledger Balance (GL)</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£138,468.21</span>
            <span className="block text-[10px] text-rose-500 font-semibold mt-1">£4,039.99 unreconciled delta</span>
          </div>
          <p className="text-[10px] text-slate-505 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pending review lines must be matched
          </p>
        </div>
      </div>

      {/* Main Grid: Upload & Match List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Match List Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Pending Transactions Feed</h3>
                <p className="text-xs text-slate-500 mt-0.5">Please review suggestions and confirm matches to update general ledger books.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Filter by description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850"
                />
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-650 shadow-inner">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">All Reconciled!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">There are no pending transaction lines requiring match review. Your Ledger and Bank balance are in-sync.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTx.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-4 animate-in slide-in-from-bottom-2 duration-200"
                  >
                    {/* Top Row: Date, ID, Bank Item */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          tx.type === "credit" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {tx.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{tx.description}</span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded uppercase tracking-wider">{tx.id}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-1">{tx.date} • Bank feed record</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-slate-900">£{tx.amount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{tx.type}</span>
                      </div>
                    </div>

                    {/* ERP Suggestion Panel */}
                    {tx.erpSuggestion ? (
                      <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-violet-750 font-bold bg-violet-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">AI Suggestion</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">{tx.erpSuggestion.similarity}% Match</span>
                          </div>
                          <strong className="block text-xs text-slate-700 mt-1">{tx.erpSuggestion.reference}</strong>
                          <div className="flex gap-3 text-[10px] text-slate-500 pt-0.5">
                            <span className="flex items-center gap-1">
                              {tx.erpSuggestion.amountMatch ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              Amount Matches
                            </span>
                            <span className="flex items-center gap-1">
                              {tx.erpSuggestion.dateMatch ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              Date Alignment
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => handleRejectMatch(tx.id)}
                            className="p-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer transition-colors active:scale-95"
                            title="Reject Match"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMatch(tx.id)}
                            className="px-3 py-2 bg-violet-600 hover:bg-violet-550 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-violet-500/10"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept Match
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] text-slate-500">No automatic match rule found inside General Ledger. Search manually.</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors"
                          >
                            Create Journal
                          </button>
                          <button 
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-white text-[11px] font-semibold rounded-lg cursor-pointer transition-colors"
                          >
                            Search Ledger
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File Import Column (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Import Statement File</h3>
              <p className="text-[11px] text-slate-500 mt-1">Upload a CSV, OFX, or QIF bank exports file to import new transaction feed items.</p>
            </div>

            {/* Drag & Drop Box */}
            <div className="relative border-2 border-dashed border-slate-200 hover:border-violet-400 bg-slate-50/50 hover:bg-violet-50/5 rounded-2xl p-6 text-center transition-all group">
              <input 
                type="file" 
                accept=".csv,.ofx,.qif"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:text-violet-600 group-hover:border-violet-200 flex items-center justify-center shadow-sm transition-all">
                  {isImporting ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    {isImporting ? "Importing statement..." : "Choose statement file"}
                  </span>
                  <span className="block text-[10px] text-slate-450 mt-1">Drag and drop or click here</span>
                </div>
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                  CSV, OFX, QIF up to 10MB
                </div>
              </div>
            </div>

            {/* Import Status Alert */}
            {importSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-800 text-[11px] leading-relaxed flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-emerald-950">Statement Imported Successfully!</span>
                  <span className="block text-emerald-800 mt-0.5">Parsed 26 statements lines. Automatching rules applied.</span>
                </div>
              </div>
            )}

            {/* Standard Bank Integrations */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected Open Banking integrations</span>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-white text-xs">
                      B
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-850">Barclays Corporate</span>
                      <span className="block text-[9px] text-slate-450 mt-0.5">Account ending 8892</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wider">Connected</span>
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-155 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-650 flex items-center justify-center font-bold text-white text-xs">
                      HS
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-850">HSBC Business Bank</span>
                      <span className="block text-[9px] text-slate-450 mt-0.5">Account ending 4120</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wider">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
