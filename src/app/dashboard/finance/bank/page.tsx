"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Landmark, ArrowDownLeft, ArrowUpRight, CheckCircle2, RefreshCw, Layers, Puzzle, AlertCircle } from "lucide-react";

export default function BankPage() {
  const { token, activeLanguage, plugins } = useApp();

  // Check if BNK plugin is active
  const bnkPlugin = plugins.find(p => p.code === "BNK");
  const isSubscribed = bnkPlugin?.isSubscribed;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");
  const [feed, setFeed] = useState<any[]>([]);
  const [ledgerLines, setLedgerLines] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && isSubscribed) {
      fetchBankData();
    }
  }, [token, isSubscribed]);

  useEffect(() => {
    if (token && selectedAccId && isSubscribed) {
      fetchFeed(selectedAccId);
    }
  }, [token, selectedAccId, isSubscribed]);

  const fetchBankData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get bank accounts
      const response = await axios.get("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data);
      if (response.data.length > 0 && !selectedAccId) {
        setSelectedAccId(response.data[0].id);
      }

      // 2. Fetch ledger lines
      const ledgerRes = await axios.get("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const flatLines = ledgerRes.data.flatMap((entry: any) => 
        (entry.lines || []).map((l: any) => ({
          ...l,
          entryDescription: entry.description,
          entryReference: entry.reference,
          entryDate: entry.entryDate
        }))
      );
      setLedgerLines(flatLines);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load bank account list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async (accountId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/finance/bank/feed/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeed(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncFeed = async () => {
    if (!selectedAccId) return;
    setSyncing(true);
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/finance/bank/feed/sync", {
        bankAccountId: selectedAccId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchFeed(selectedAccId);
      
      // Reload accounts to update sync timestamps
      const accRes = await axios.get("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(accRes.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Bank feed synchronization failed.");
    } finally {
      setSyncing(false);
    }
  };

  const handleReconcile = async (feedLineId: string, ledgerLineId: string) => {
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/finance/bank/reconcile", {
        bankStatementLineId: feedLineId,
        ledgerLineId: ledgerLineId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh feed & accounts
      await fetchFeed(selectedAccId);
      await fetchBankData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Reconciliation failed. Ensure amounts align.");
    }
  };

  const formatMoney = (val: number, curr = "GBP") => {
    return new Intl.NumberFormat(activeLanguage || "en-GB", {
      style: "currency",
      currency: curr
    }).format(val);
  };

  // Lock screen if BNK plugin is not active
  if (!isSubscribed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
        <div className="p-5 bg-violet-50 border border-violet-100 rounded-3xl text-violet-650 animate-pulse shadow-md">
          <Puzzle className="w-16 h-16" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 font-heading">Unlock Open Banking & Feed Reconciliation</h2>
          <p className="text-slate-655 text-sm leading-relaxed">
            Dynamically sync bank statement lines and auto-match them with ledger entries. Securely connect your accounts using Barclays, HSBC, or other UK banks.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left w-full space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>Marketplace Add-on</span>
            <span className="text-violet-650 text-sm font-semibold">£29.99/mo</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Subscribing unlocks live background banking sync, CSV/QIF statement imports, and our automated ledger recommendation engine.
          </p>
        </div>
        <a 
          href="/dashboard/settings/plugins"
          className="inline-flex items-center gap-2 px-6 py-3 bg-violet-650 hover:bg-violet-600 text-white font-semibold rounded-2xl cursor-pointer shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-sm"
        >
          <Puzzle className="w-4 h-4" />
          Go to Marketplace Add-ons
        </a>
      </div>
    );
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Bank Connections</h2>
          <p className="text-slate-655 text-sm mt-1">Synchronize live statement feeds and reconcile transactions against the general ledger.</p>
        </div>
        
        {selectedAccId && (
          <button
            onClick={handleSyncFeed}
            disabled={syncing}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-655 hover:bg-violet-600 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> 
            {syncing ? "Connecting Plaid..." : "Sync Bank Feed"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-550 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading accounts...
        </div>
      ) : (
        <>
          {/* Account Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map(acc => (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccId(acc.id)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer bg-white ${
                  selectedAccId === acc.id 
                    ? "border-violet-500 shadow-md ring-1 ring-violet-500/10" 
                    : "border-slate-200 hover:border-slate-350 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">{acc.accountName}</span>
                  <Landmark className={`w-4.5 h-4.5 ${selectedAccId === acc.id ? "text-violet-650" : "text-slate-450"}`} />
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-slate-900">{formatMoney(acc.currentBalance, acc.currencyCode)}</h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
                    <span>Acc: ****{acc.accountNumber.slice(-4)}</span>
                    <span>{acc.sortCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reconciliation Terminal */}
          {selectedAccount && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Statement Feed */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-indigo-600" />
                  Live Bank Statement Feed (Open Banking)
                </h3>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {feed.length === 0 ? (
                    <div className="text-slate-500 text-xs italic text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Bank feed is empty. Click "Sync Bank Feed" to synchronize transaction list.
                    </div>
                  ) : (
                    feed.map(item => (
                      <div 
                        key={item.id} 
                        className={`p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs transition-colors ${
                          item.isReconciled 
                            ? "border-emerald-100 bg-emerald-50/40 text-slate-500" 
                            : "border-slate-205 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {item.amount > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 animate-in fade-in" />
                            )}
                            <span className="font-bold text-slate-800">{item.description}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block font-mono">Ref: {item.reference || "N/A"}</span>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span className={`block font-bold ${item.amount > 0 ? "text-emerald-700" : "text-slate-800"}`}>
                              {item.amount > 0 ? "+" : ""}{formatMoney(item.amount, selectedAccount.currencyCode)}
                            </span>
                            <span className="block text-[9px] text-slate-555 font-mono mt-0.5">
                              {new Date(item.transactionDate).toLocaleDateString()}
                            </span>
                          </div>

                          {item.isReconciled ? (
                            <span className="p-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : (
                            /* Reconcile match button suggested automatically */
                            <div className="space-y-1">
                              {ledgerLines
                                .filter(ll => Math.abs(ll.debit > 0 ? ll.debit : ll.credit) === Math.abs(item.amount))
                                .slice(0, 1)
                                .map(match => (
                                  <button
                                    key={match.id}
                                    onClick={() => handleReconcile(item.id, match.id)}
                                    className="py-1 px-2.5 rounded bg-violet-650 hover:bg-violet-600 text-white text-[10px] font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
                                  >
                                    Match GL Code
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* General Ledger Postings */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-violet-650" />
                  General Ledger Journal lines (Unmatched)
                </h3>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {ledgerLines.filter(ll => !feed.some(f => f.isReconciled && f.reconciledLedgerLineId === ll.id)).length === 0 ? (
                    <div className="text-slate-500 text-xs italic text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      All ledger journal lines are matched.
                    </div>
                  ) : (
                    ledgerLines
                      .filter(ll => !feed.some(f => f.isReconciled && f.reconciledLedgerLineId === ll.id))
                      .map(line => {
                        const amt = line.debit > 0 ? line.debit : -line.credit;
                        return (
                          <div key={line.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-350 transition-colors">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 block">{line.entryDescription}</span>
                              <div className="flex gap-2 text-[9px] text-slate-500 font-mono">
                                <span>Code: {line.accountCode}</span>
                                <span>•</span>
                                <span>Ref: {line.entryReference || "N/A"}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`block font-bold ${amt > 0 ? "text-emerald-700" : "text-slate-800"}`}>
                                {amt > 0 ? "+" : ""}{formatMoney(amt, selectedAccount.currencyCode)}
                              </span>
                              <span className="block text-[9px] text-slate-555 font-mono mt-0.5">
                                {new Date(line.entryDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })
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
