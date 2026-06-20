"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { ClipboardCopy, Plus, CheckCircle, Scale, DollarSign } from "lucide-react";

export default function QuotesPage() {
  const { token, user, activeLanguage, activeCurrency } = useApp();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  
  const [selectedStockId, setSelectedStockId] = useState("");
  const [lineQty, setLineQty] = useState(5);
  const [linePrice, setLinePrice] = useState(320.0);
  const [taxRate, setTaxRate] = useState(0.20);

  useEffect(() => {
    if (token) fetchQuotesData();
  }, [token]);

  const fetchQuotesData = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/quotes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(response.data);

      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(stockRes.data);
      if (stockRes.data.length > 0) {
        setSelectedStockId(stockRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        quoteNumber,
        customerName,
        quoteDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 65 * 1000).toISOString(),
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: [
          {
            stockItemId: selectedStockId,
            quantity: Number(lineQty),
            unitPrice: Number(linePrice),
            taxRate: Number(taxRate)
          }
        ]
      };

      await axios.post("http://localhost:5000/api/quotes", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setQuoteNumber("");
      setCustomerName("");
      fetchQuotesData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post quote.");
    }
  };

  const formatMoney = (val: number, curr = activeCurrency) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: curr
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest font-heading">Sales</span>
          <h2 className="text-3xl font-bold font-heading text-slate-100">Customer Quotes</h2>
          <p className="text-slate-400 text-sm mt-1">Draft customer sales proposals, estimates, and check contract expiry timelines.</p>
        </div>
        
        {(user?.role === "CompanyAdmin" || user?.role === "Sales" || user?.role === "GlobalAdmin") && (
          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Draft Customer Quote
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Estimates list */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <ClipboardCopy className="w-5 h-5 text-violet-400" />
          Proposals Ledger
        </h3>

        {loading ? (
          <div className="text-slate-500 text-xs text-center py-6">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6">No proposals generated.</div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                <div>
                  <span className="font-mono font-bold text-violet-400 block">{q.quoteNumber}</span>
                  <span className="text-slate-400 block mt-0.5">{q.customerName}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Valid till: {new Date(q.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-200">{formatMoney(q.totalGross, q.currencyCode)}</span>
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-violet-400 px-1.5 py-0.5 rounded bg-violet-950/20 border border-violet-900/40 uppercase">
                    Draft Proposal
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-100">Draft Sales Proposal / Estimate</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Quote Number</label>
                  <input
                    type="text"
                    required
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    placeholder="EST-2026-0002"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Builders Ltd"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setExchangeRate(e.target.value === "GBP" ? 1.0 : (e.target.value === "USD" ? 1.25 : 1.15));
                    }}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Exchange Rate (to GBP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Estimate line */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <span className="block text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-violet-400" /> Estimate Line Details
                </span>
                
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Select Product</label>
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300"
                  >
                    {stockList.map(item => (
                      <option key={item.id} value={item.id}>{item.sku} - {getTranslatedName(item.name)}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Quantity</label>
                    <input
                      type="number"
                      value={lineQty}
                      onChange={(e) => setLineQty(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Unit Price</label>
                    <input
                      type="number"
                      value={linePrice}
                      onChange={(e) => setLinePrice(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300"
                    >
                      <option value="0.20">20% Standard</option>
                      <option value="0.05">5% Reduced</option>
                      <option value="0.00">0% Zero-Rate</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                >
                  Save Estimate Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getTranslatedName(nameJsonStr: string) {
  try {
    const translations = JSON.parse(nameJsonStr);
    return translations["en-GB"] || nameJsonStr;
  } catch {
    return nameJsonStr;
  }
}
