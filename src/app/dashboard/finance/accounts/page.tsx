"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { BookOpen, Plus, Loader2, RefreshCw } from "lucide-react";

export default function AccountsPage() {
  const { token, activeLanguage } = useApp();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(0); // LedgerAccountType: 0 = Revenue
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/finance/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load Chart of Accounts.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        accountCode: code,
        name,
        type: Number(type),
        description: desc
      };
      await axios.post("http://localhost:5000/api/finance/accounts", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setCode("");
      setName("");
      setType(0);
      setDesc("");
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add ledger account.");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (t: number) => {
    switch (t) {
      case 0: return { text: "Revenue", style: "bg-emerald-50 border-emerald-250 text-emerald-700" };
      case 1: return { text: "Expense", style: "bg-amber-50 border-amber-250 text-amber-700" };
      case 2: return { text: "Asset", style: "bg-sky-50 border-sky-250 text-sky-700" };
      case 3: return { text: "Liability", style: "bg-rose-50 border-rose-250 text-rose-700" };
      case 4: return { text: "Equity", style: "bg-purple-50 border-purple-250 text-purple-700" };
      default: return { text: "Unknown", style: "bg-slate-50 border-slate-200 text-slate-600" };
    }
  };

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest">Finance</span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Chart of Accounts</h2>
          <p className="text-slate-500 text-xs mt-1">Manage the ledger account codes used for double-entry journals, sales invoicing, and expense claims.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAccounts}
            className="p-2 border border-[#ccd3db] hover:bg-slate-50 text-slate-600 rounded transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="py-2 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white shadow-sm font-semibold flex items-center gap-2 text-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Ledger Code
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Main Account Table Card */}
      <div className="p-6 rounded border border-[#e1e5eb] bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#1a2d3c] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#00b7e2]" />
          Chart of Accounts Registry
        </h3>

        {loading ? (
          <div className="text-slate-400 text-xs text-center py-8">Loading chart of accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="text-slate-450 text-xs text-center py-8">No account codes registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e1e5eb] text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4 w-[120px]">Code</th>
                  <th className="py-3 px-4 w-[220px]">Name</th>
                  <th className="py-3 px-4 w-[120px]">Type</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e5eb]">
                {accounts.map((acc) => {
                  const typeBadge = getTypeLabel(acc.type);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1a2d3c]">{acc.accountCode}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{acc.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${typeBadge.style}`}>
                          {typeBadge.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 leading-relaxed">{acc.description || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-5 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3">Register Ledger Code</h3>
            
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Account Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="2030"
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-[#334155]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Account Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-[#334155]"
                  >
                    <option value={0}>Revenue</option>
                    <option value={1}>Expense</option>
                    <option value={2}>Asset</option>
                    <option value={3}>Liability</option>
                    <option value={4}>Equity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Account Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sales - Hardware Division"
                  className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-[#334155]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Notes on what transactions should post to this code"
                  rows={3}
                  className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-[#334155] resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e1e5eb]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#ccd3db] text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white text-xs font-semibold rounded disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
