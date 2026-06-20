"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Landmark, ArrowDownLeft, ArrowUpRight, CheckCircle2, RefreshCw, Layers } from "lucide-react";

export default function BankPage() {
  const { token, activeLanguage } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");
  const [feed, setFeed] = useState<any[]>([]);
  const [ledgerLines, setLedgerLines] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchBankData();
  }, [token]);

  useEffect(() => {
    if (token && selectedAccId) {
      fetchFeed(selectedAccId);
    }
  }, [token, selectedAccId]);

  const fetchBankData = async () => {
    setLoading(true);
    try {
      // 1. Get bank accounts
      const response = await axios.get("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data);
      if (response.data.length > 0) {
        setSelectedAccId(response.data[0].id);
      }

      // 2. Fetch unreconciled ledger lines to match (e.g. from cash code "3000" or "4000")
      // In a real system, we'd query unmatched journal items. Here we fetch the ledger lines list.
      const ledgerRes = await axios.get("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const flatLines = ledgerRes.data.flatMap((entry: any) => 
        entry.lines.map((l: any) => ({
          ...l,
          entryDescription: entry.description,
          entryReference: entry.reference,
          entryDate: entry.entryDate
        }))
      );
      setLedgerLines(flatLines);

    } catch (err) {
      console.error(err);
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
    try {
      await axios.post("http://localhost:5000/api/finance/bank/feed/sync", {
        bankAccountId: selectedAccId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchFeed(selectedAccId);
      // reload bank accounts to show updated sync timestamps
      const accRes = await axios.get("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(accRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleReconcile = async (feedLineId: string, ledgerLineId: string) => {
    try {
      await axios.post("http://localhost:5000/api/finance/bank/reconcile", {
        bankStatementLineId: feedLineId,
        ledgerLineId: ledgerLineId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // refresh
      await fetchFeed(selectedAccId);
      await fetchBankData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Reconciliation failed. Ensure amounts align.");
    }
  };

  const formatMoney = (val: number, curr = "GBP") => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: curr
    }).format(val);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-100">Bank Connections</h2>
          <p className="text-slate-400 text-sm mt-1">Synchronize live statement feeds and reconcile transactions against the general ledger.</p>
        </div>
        
        {selectedAccId && (
          <button
            onClick={handleSyncFeed}
            disabled={syncing}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> 
            {syncing ? "Connecting Plaid..." : "Sync Bank Feed"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <div 
            key={acc.id}
            onClick={() => setSelectedAccId(acc.id)}
            className={`p-6 rounded-2xl border transition-all cursor-pointer bg-slate-900/40 backdrop-blur-sm ${
              selectedAccId === acc.id 
                ? "border-violet-500/30 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/10" 
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide truncate">{acc.accountName}</span>
              <Landmark className={`w-4.5 h-4.5 ${selectedAccId === acc.id ? "text-violet-400" : "text-slate-600"}`} />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-slate-100">{formatMoney(acc.currentBalance, acc.currencyCode)}</h3>
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
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-cyan-400" />
              Live Bank Statement Feed (Open Banking)
            </h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {feed.length === 0 ? (
                <div className="text-slate-500 text-xs italic text-center py-8 border border-dashed border-slate-850 rounded-xl">
                  Bank feed is empty. Click "Sync Bank Feed" to simulate transaction sync.
                </div>
              ) : (
                feed.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3 bg-slate-950/80 border rounded-xl flex items-center justify-between text-xs transition-colors ${
                      item.isReconciled 
                        ? "border-emerald-950 text-slate-400" 
                        : "border-slate-800 hover:border-slate-750"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.amount > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span className="font-bold text-slate-200">{item.description}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block font-mono">Ref: {item.reference || "N/A"}</span>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <span className={`block font-bold ${item.amount > 0 ? "text-emerald-400" : "text-slate-200"}`}>
                          {item.amount > 0 ? "+" : ""}{formatMoney(item.amount, selectedAccount.currencyCode)}
                        </span>
                        <span className="block text-[9px] text-slate-600 font-mono mt-0.5">
                          {new Date(item.transactionDate).toLocaleDateString()}
                        </span>
                      </div>

                      {item.isReconciled ? (
                        <span className="p-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        /* Try to auto-suggest reconcile button */
                        <div className="space-y-1">
                          {ledgerLines
                            .filter(ll => Math.abs(ll.debit > 0 ? ll.debit : ll.credit) === Math.abs(item.amount))
                            .slice(0, 1)
                            .map(match => (
                              <button
                                key={match.id}
                                onClick={() => handleReconcile(item.id, match.id)}
                                className="py-1 px-2.5 rounded bg-cyan-900 hover:bg-cyan-800 border border-cyan-850 text-cyan-200 text-[10px] font-bold transition-all shadow"
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

          {/* Ledger Mappings Suggestions */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              General Ledger Postings (Unmatched)
            </h3>

            <p className="text-xs text-slate-500">Unmatched journal entries in company ledger accounts (Debtors, Creditors, Expenses):</p>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {ledgerLines
                .filter(ll => !feed.some(f => f.isReconciled && f.reconciledLedgerLineId === ll.id))
                .map(line => (
                  <div key={line.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-xs flex justify-between items-center font-mono">
                    <div>
                      <strong className="text-slate-300 block font-sans truncate max-w-[200px]">{line.entryDescription}</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Account Code: {line.AccountCode}</span>
                    </div>
                    <div className="text-right">
                      <span className={`block font-bold ${line.debit > 0 ? "text-emerald-400" : "text-violet-400"}`}>
                        {line.debit > 0 ? `DR ${formatMoney(line.debit, "GBP")}` : `CR ${formatMoney(line.credit, "GBP")}`}
                      </span>
                      <span className="block text-[9px] text-slate-650 mt-0.5 font-sans">
                        Ref: {line.entryReference}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
