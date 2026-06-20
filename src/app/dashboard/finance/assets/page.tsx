"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Landmark, Plus, RefreshCw, Calendar, Loader2 } from "lucide-react";

export default function AssetsPage() {
  const { token, user, activeLanguage } = useApp();

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState(2000.0);
  const [method, setMethod] = useState(0); // StraightLine
  const [rate, setRate] = useState(0.20); // 20%

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchAssets();
  }, [token]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/finance/assets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/finance/assets", {
        assetCode,
        name,
        description: desc,
        purchaseCost: Number(cost),
        purchaseDate: new Date().toISOString(),
        method: Number(method),
        depreciationRate: Number(rate)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setAssetCode("");
      setName("");
      setDesc("");
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create asset.");
    }
  };

  const handleDepreciate = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/finance/assets/${id}/depreciate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.message || "Depreciation run failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: "GBP"
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Fixed Assets</h2>
          <p className="text-slate-655 text-sm mt-1">Track company equipment capitalization and execute monthly depreciation runs.</p>
        </div>
        
        {(user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin") && (
          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Capitalize New Asset
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs">
          {error}
        </div>
      )}

      {/* Assets Grid */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-violet-650" />
          Capitalized Assets Registers
        </h3>

        {loading ? (
          <div className="text-slate-500 text-xs text-center py-6">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6">No capitalized assets recorded.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-violet-700">{asset.assetCode}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Purchase: {new Date(asset.purchaseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{asset.name}</h4>
                    <p className="text-xs text-slate-600 mt-1">{asset.description}</p>
                  </div>
                  
                  {/* Financial details */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] font-mono border-t border-slate-200">
                    <div>
                      <span className="block text-slate-500 font-sans uppercase font-bold text-[8px]">Cost Value</span>
                      <span className="text-slate-800 font-bold">{formatMoney(asset.purchaseCost)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-sans uppercase font-bold text-[8px]">Book Value</span>
                      <span className="text-cyan-750 font-bold">{formatMoney(asset.currentBookValue)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-sans uppercase font-bold text-[8px]">Rate (Method)</span>
                      <span className="text-slate-600">{asset.depreciationRate * 100}% ({asset.method === 0 ? "SL" : "RB"})</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500">
                    {asset.lastDepreciationDate 
                      ? `Last run: ${new Date(asset.lastDepreciationDate).toLocaleDateString()}` 
                      : "Never depreciated"}
                  </div>
                  
                  {(user?.role === "Accounts" || user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin") && (
                    <button
                      onClick={() => handleDepreciate(asset.id)}
                      disabled={processingId === asset.id || asset.currentBookValue <= 0.0}
                      className="py-1.5 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[10px] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === asset.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Post Depreciation</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">Capitalize Fixed Asset</h3>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Asset Code</label>
                  <input
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="AST-2026-002"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Purchase Cost (£)</label>
                  <input
                    type="number"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Asset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Office Computers Update"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Acquisition details..."
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  >
                    <option value={0}>Straight Line (SL)</option>
                    <option value={1}>Reducing Balance (RB)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Annual Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Post Capitalization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
