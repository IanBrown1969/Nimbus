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
  const [unitOfSale, setUnitOfSale] = useState<"stock" | "sell">("sell");
  const [lineQty, setLineQty] = useState(5);
  const [linePrice, setLinePrice] = useState(320.0);
  const [taxRate, setTaxRate] = useState(0.20);

  useEffect(() => {
    if (token) fetchQuotesData();
  }, [token]);

  useEffect(() => {
    const prod = stockList.find(item => String(item.id) === String(selectedStockId));
    if (prod) {
      if (unitOfSale === "stock") {
        setLinePrice(prod.basePrice || 0);
      } else {
        const ratio = prod.conversionRatio || 1;
        setLinePrice(Number(((prod.basePrice || 0) / ratio).toFixed(4)));
      }
    }
  }, [selectedStockId, unitOfSale, stockList]);

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
      const prod = stockList.find(item => String(item.id) === String(selectedStockId));
      const ratio = prod ? (prod.conversionRatio || 1) : 1;

      const qtyToSend = unitOfSale === "stock" ? Number(lineQty) * ratio : Number(lineQty);
      const priceToSend = unitOfSale === "stock" ? Number(linePrice) / ratio : Number(linePrice);

      const payload = {
        quoteNumber,
        customerName,
        quoteDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: [
          {
            stockItemId: selectedStockId,
            quantity: qtyToSend,
            unitPrice: priceToSend,
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
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Sales</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Customer Quotes</h2>
          <p className="text-slate-655 text-sm mt-1">Draft customer sales proposals, estimates, and check contract expiry timelines.</p>
        </div>
        
        {(user?.role === "CompanyAdmin" || user?.role === "Sales" || user?.role === "GlobalAdmin") && (
          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Draft Customer Quote
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs">
          {error}
        </div>
      )}

      {/* Estimates list */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCopy className="w-5 h-5 text-violet-650" />
          Proposals Ledger
        </h3>

        {loading ? (
          <div className="text-slate-500 text-xs text-center py-6">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6">No proposals generated.</div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id} className="p-4 bg-slate-55 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                <div>
                  <span className="font-mono font-bold text-violet-700 block">{q.quoteNumber}</span>
                  <span className="text-slate-600 block mt-0.5">{q.customerName}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Valid till: {new Date(q.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-850">{formatMoney(q.totalGross, q.currencyCode)}</span>
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-violet-750 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 uppercase">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">Draft Sales Proposal / Estimate</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Quote Number</label>
                  <input
                    type="text"
                    required
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    placeholder="EST-2026-0002"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Builders Ltd"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setExchangeRate(e.target.value === "GBP" ? 1.0 : (e.target.value === "USD" ? 1.25 : 1.15));
                    }}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Exchange Rate (to GBP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>



              {/* Estimate line */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-violet-650" /> Estimate Line Details
                </span>
                
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Select Product</label>
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-violet-500"
                  >
                    {stockList.map(item => (
                      <option key={item.id} value={item.id}>{item.sku} - {getTranslatedName(item.name)}</option>
                    ))}
                  </select>
                </div>
 
                {(() => {
                  const selectedProduct = stockList.find(item => String(item.id) === String(selectedStockId));
                  if (!selectedProduct) return null;
 
                  const ratio = selectedProduct.conversionRatio || 1;
                  const rawBase = selectedProduct.basePrice || 0;
                  const activeBase = unitOfSale === "stock" ? rawBase : rawBase / ratio;
 
                  const contractPrice = Number((activeBase * 0.8).toFixed(4));
                  const groupPrice = Number((activeBase * 0.9).toFixed(4));
                  const promoPrice = Number((activeBase * 0.85).toFixed(4));
                  const basePriceVal = Number(activeBase.toFixed(4));
 
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Unit of Sale</label>
                          <select
                            value={unitOfSale}
                            onChange={(e) => setUnitOfSale(e.target.value as any)}
                            className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-violet-500"
                          >
                            <option value="sell">Selling Unit ({selectedProduct.sellUnitOfSale || "Each"})</option>
                            <option value="stock">Stocking Unit ({selectedProduct.stockUnitOfSale || "Pallet"})</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-2">
                          <span className="text-[10px] text-slate-500 font-semibold italic">
                            1 {selectedProduct.stockUnitOfSale} = {selectedProduct.conversionRatio} {selectedProduct.sellUnitOfSale}
                          </span>
                        </div>
                      </div>
 
                      {/* Complex Pricing Breakdown Widget */}
                      <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Pricing Tiers (Click to Apply)
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setLinePrice(contractPrice)}
                            className="p-1.5 text-left border border-slate-150 rounded hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-violet-650 font-bold">Contract Pricing</span>
                            <span>£{contractPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(groupPrice)}
                            className="p-1.5 text-left border border-slate-150 rounded hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-violet-650 font-bold">Group Pricing</span>
                            <span>£{groupPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(promoPrice)}
                            className="p-1.5 text-left border border-slate-150 rounded hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-violet-650 font-bold">Promotional Pricing</span>
                            <span>£{promoPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(basePriceVal)}
                            className="p-1.5 text-left border border-slate-150 rounded hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-violet-650 font-bold">All Customer Pricing</span>
                            <span>£{basePriceVal.toFixed(2)}</span>
                          </button>
                        </div>
                      </div>
 
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">
                            Qty ({unitOfSale === "stock" ? selectedProduct.stockUnitOfSale : selectedProduct.sellUnitOfSale})
                          </label>
                          <input
                            type="number"
                            value={lineQty}
                            onChange={(e) => setLineQty(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">
                            Price (per {unitOfSale === "stock" ? selectedProduct.stockUnitOfSale : selectedProduct.sellUnitOfSale})
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={linePrice}
                            onChange={(e) => setLinePrice(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                          <select
                            value={taxRate}
                            onChange={(e) => setTaxRate(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-violet-500"
                          >
                            <option value="0.20">20% Standard</option>
                            <option value="0.05">5% Reduced</option>
                            <option value="0.00">0% Zero-Rate</option>
                          </select>
                        </div>
                      </div>
                    </>
                  );
                })()}
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
