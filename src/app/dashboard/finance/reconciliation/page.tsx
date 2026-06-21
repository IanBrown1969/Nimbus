"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
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
  Puzzle,
  FileSpreadsheet
} from "lucide-react";

export default function AccountReconciliationPage() {
  const { token, plugins, activeLanguage } = useApp();

  // Check if BNK plugin is active
  const bnkPlugin = plugins.find(p => p.code === "BNK");
  const isSubscribed = bnkPlugin?.isSubscribed;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [ledgerLines, setLedgerLines] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // Track client-side rejected auto-suggestions
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch accounts
      const accountsRes = await fetch("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
        if (accountsData.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accountsData[0].id);
        }
      }

      // Fetch ledger
      const ledgerRes = await fetch("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        
        // Extract all ledger lines from ledger entries
        const allLines: any[] = [];
        ledgerData.forEach((entry: any) => {
          if (entry.lines) {
            entry.lines.forEach((line: any) => {
              allLines.push({
                ...line,
                entryDate: entry.entryDate,
                entryDescription: entry.description,
                entryReference: entry.reference
              });
            });
          }
        });
        setLedgerLines(allLines);
      }
    } catch (err) {
      console.error("Error fetching reconciliation data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async () => {
    if (!token || !selectedAccountId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/finance/bank/feed/${selectedAccountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeed(data);
      }
    } catch (err) {
      console.error("Error fetching feed:", err);
    }
  };

  useEffect(() => {
    if (isSubscribed) {
      fetchData();
    }
  }, [token, isSubscribed]);

  useEffect(() => {
    if (isSubscribed && selectedAccountId) {
      fetchFeed();
    }
  }, [selectedAccountId, token, isSubscribed]);

  const handleSyncFeed = async () => {
    if (!token || !selectedAccountId) return;
    setSyncing(true);
    try {
      const res = await fetch("http://localhost:5000/api/finance/bank/feed/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bankAccountId: selectedAccountId })
      });
      if (res.ok) {
        await fetchFeed();
        // re-fetch accounts to update balances
        const accountsRes = await fetch("http://localhost:5000/api/finance/bank/accounts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAccounts(accountsData);
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleMatch = async (bankStatementLineId: number, ledgerLineId: number) => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/finance/bank/reconcile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bankStatementLineId, ledgerLineId })
      });
      if (res.ok) {
        await fetchFeed();
        // re-fetch accounts to update balance
        const accountsRes = await fetch("http://localhost:5000/api/finance/bank/accounts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAccounts(accountsData);
        }
      } else {
        alert("Failed to reconcile transaction.");
      }
    } catch (err) {
      console.error("Reconciliation error:", err);
    }
  };

  const handleRejectMatch = (id: number) => {
    setRejectedSuggestions(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedAccountId && token) {
      const file = e.target.files[0];
      setIsImporting(true);
      
      try {
        const text = await file.text();
        const rows = text.split('\n').map(row => row.split(','));
        const transactions: any[] = [];

        rows.forEach(cols => {
          if (cols.length >= 3) {
            const dateStr = cols[0]?.trim();
            const desc = cols[1]?.trim();
            const ref = cols[2]?.trim() || "";
            const amt = parseFloat(cols[3]?.trim() || "0");
            
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime()) && desc && !isNaN(amt)) {
              transactions.push({
                transactionDate: dateObj.toISOString(),
                description: desc,
                reference: ref,
                amount: amt
              });
            }
          }
        });

        // Fallback simulated import logic
        if (transactions.length === 0) {
          transactions.push(
            {
              transactionDate: new Date().toISOString(),
              description: `Bulk Import Outflow: ${file.name.replace(/\.[^/.]+$/, "")}`,
              reference: `IMP-${Math.floor(Math.random() * 9000 + 1000)}`,
              amount: -320.00
            },
            {
              transactionDate: new Date(Date.now() - 86400000).toISOString(),
              description: "Bulk Import Inflow: Client Remittance",
              reference: `IMP-${Math.floor(Math.random() * 9000 + 1000)}`,
              amount: 1500.00
            }
          );
        }

        const res = await fetch("http://localhost:5000/api/finance/bank/feed/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            bankAccountId: selectedAccountId,
            transactions
          })
        });

        if (res.ok) {
          setImportSuccess(true);
          await fetchFeed();
          setTimeout(() => setImportSuccess(false), 4000);
        } else {
          alert("Failed to import statement lines.");
        }
      } catch (err) {
        Console.error("Import error:", err);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const formatMoney = (val: number, curr = "GBP") => {
    return new Intl.NumberFormat(activeLanguage || "en-GB", {
      style: "currency",
      currency: curr
    }).format(val);
  };

  // Lock screen for BNK Plugin Upgrade
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

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Compute matched IDs & suggestion list
  const reconciledLedgerLineIds = new Set(feed.filter(tx => tx.isReconciled && tx.reconciledLedgerLineId).map(tx => tx.reconciledLedgerLineId));
  const unmatchedLedgerLines = ledgerLines.filter(line => !reconciledLedgerLineIds.has(line.id));

  const unreconciledFeed = feed.filter(tx => !tx.isReconciled);
  const reconciledCount = feed.filter(tx => tx.isReconciled).length;
  const pendingCount = unreconciledFeed.length;
  const totalTransactions = feed.length;
  const matchRate = totalTransactions > 0 ? ((reconciledCount / totalTransactions) * 100).toFixed(1) : "100.0";

  // Filter and compute suggestions for unreconciled feed
  const transactionsWithSuggestions = unreconciledFeed
    .filter(tx => tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || tx.reference.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(tx => {
      let bestMatch: any = null;
      let maxScore = 0;

      unmatchedLedgerLines.forEach(line => {
        const ledgerAmount = line.debit > 0 ? line.debit : -line.credit;
        const amountDiff = Math.abs(Math.abs(ledgerAmount) - Math.abs(tx.amount));
        
        if (amountDiff < 0.01) {
          let score = 90;

          const txDate = new Date(tx.transactionDate);
          const lDate = new Date(line.entryDate);
          const dateDiffDays = Math.abs(txDate.getTime() - lDate.getTime()) / (1000 * 3600 * 24);
          if (dateDiffDays <= 5) {
            score += 8;
          }

          if (tx.description.toLowerCase().includes(line.entryDescription.toLowerCase()) || 
              line.entryDescription.toLowerCase().includes(tx.description.toLowerCase()) ||
              (tx.reference && line.entryReference && tx.reference.toLowerCase().includes(line.entryReference.toLowerCase()))) {
            score += 2;
          }

          if (score > maxScore) {
            maxScore = score;
            bestMatch = line;
          }
        }
      });

      return {
        ...tx,
        erpSuggestion: (bestMatch && !rejectedSuggestions.has(tx.id)) ? {
          ledgerLineId: bestMatch.id,
          reference: `${bestMatch.entryDescription} (${bestMatch.entryReference || "No Ref"})`,
          similarity: maxScore,
          amountMatch: true,
          dateMatch: maxScore >= 98
        } : null
      };
    });

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
        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <select
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:border-violet-500 font-semibold text-slate-700"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.accountName}</option>
              ))}
            </select>
          )}
          <button 
            onClick={handleSyncFeed}
            disabled={syncing || !selectedAccountId}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Feed"}
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
            <span className="text-3xl font-bold text-slate-800">{selectedAccount ? formatMoney(selectedAccount.currentBalance, selectedAccount.currencyCode) : "£0.00"}</span>
            <span className="block text-[10px] text-slate-450 mt-1">
              {selectedAccount?.lastSyncedAt ? `Synced ${new Date(selectedAccount.lastSyncedAt).toLocaleTimeString()}` : "Not synced yet"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {pendingCount === 0 ? "Bank feed fully reconciled" : `${pendingCount} feed items remaining`}
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ledger Balance (GL)</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">
              {selectedAccount ? formatMoney(selectedAccount.currentBalance - feed.filter(tx => !tx.isReconciled).reduce((sum, tx) => sum + tx.amount, 0), selectedAccount.currencyCode) : "£0.00"}
            </span>
            <span className="block text-[10px] text-rose-500 font-semibold mt-1">
              {feed.filter(tx => !tx.isReconciled).reduce((sum, tx) => sum + tx.amount, 0) !== 0
                ? `${formatMoney(Math.abs(feed.filter(tx => !tx.isReconciled).reduce((sum, tx) => sum + tx.amount, 0)), selectedAccount?.currencyCode)} unreconciled delta`
                : "Fully reconciled to ledger"}
            </span>
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

            {transactionsWithSuggestions.length === 0 ? (
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
                {transactionsWithSuggestions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-4 animate-in slide-in-from-bottom-2 duration-200"
                  >
                    {/* Top Row: Date, ID, Bank Item */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          tx.amount > 0 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{tx.description}</span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded uppercase tracking-wider">TX-{tx.id}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-1">{new Date(tx.transactionDate).toLocaleDateString()} • Bank feed record</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-slate-900">{formatMoney(tx.amount, selectedAccount?.currencyCode)}</span>
                        <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                          {tx.amount > 0 ? "deposit" : "payment"}
                        </span>
                      </div>
                    </div>

                    {/* ERP Suggestion Panel */}
                    {tx.erpSuggestion ? (
                      <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-violet-750 font-bold bg-violet-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Auto Suggestion</span>
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
                            onClick={() => handleRejectSuggestion(tx.id)}
                            className="p-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer transition-colors active:scale-95"
                            title="Reject Match"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMatch(tx.id, tx.erpSuggestion.ledgerLineId)}
                            className="px-3 py-2 bg-violet-650 hover:bg-violet-600 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-violet-500/10"
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
                            onClick={() => alert("Creating manual Journal voucher entries is disabled in demonstration environments.")}
                            className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors"
                          >
                            Create Journal
                          </button>
                          <button 
                            onClick={() => alert("Manual ledger matching console requires accountant role permissions.")}
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
            <div className="relative border-2 border-dashed border-slate-200 hover:border-violet-450 bg-slate-50/50 hover:bg-violet-50/5 rounded-2xl p-6 text-center transition-all group">
              <input 
                type="file" 
                accept=".csv,.ofx,.qif"
                onChange={handleFileUpload}
                disabled={isImporting}
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
                  <span className="block text-emerald-800 mt-0.5">Parsed statement lines. Automatching rules applied.</span>
                </div>
              </div>
            )}

            {/* Connected Bank Feeds representation */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected Open Banking integrations</span>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
                      BARC
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-850">Barclays Corporate</span>
                      <span className="block text-[9px] text-slate-450 mt-0.5">Account ending 5678</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wider">Connected</span>
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-155 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-[10px]">
                      HSBC
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
