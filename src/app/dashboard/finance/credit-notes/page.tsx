"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { FileSpreadsheet, Plus, CheckCircle, Loader2 } from "lucide-react";

export default function CreditNotesPage() {
  const { token, activeLanguage, activeCurrency } = useApp();

  const [notes, setNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [cnNumber, setCnNumber] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  // Line item states
  const [selectedStockId, setSelectedStockId] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [linePrice, setLinePrice] = useState(10.0);
  const [vatRate, setVatRate] = useState(0.20);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const notesRes = await axios.get("http://localhost:5000/api/finance/credit-notes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(notesRes.data);

      const invoiceRes = await axios.get("http://localhost:5000/api/finance/invoices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(invoiceRes.data);

      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(stockRes.data);
      if (stockRes.data.length > 0) {
        setSelectedStockId(stockRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load credit notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCN = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        creditNoteNumber: cnNumber,
        invoiceId: invoiceId === "" ? null : invoiceId,
        customerName,
        lines: [
          {
            stockItemId: selectedStockId,
            quantity: Number(lineQty),
            unitPrice: Number(linePrice),
            taxRate: Number(vatRate)
          }
        ]
      };

      await axios.post("http://localhost:5000/api/finance/credit-notes", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setCustomerName("");
      setCnNumber("");
      setInvoiceId("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to issue credit note.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency
    }).format(val);
  };

  const getTranslatedName = (nameJsonStr: string) => {
    try {
      const translations = JSON.parse(nameJsonStr);
      return translations["en-GB"] || nameJsonStr;
    } catch {
      return nameJsonStr;
    }
  };

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest">Finance</span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Credit Notes</h2>
          <p className="text-slate-500 text-xs mt-1">Issue credit notes to reverse invoice balances, adjust customer accounts, and balance the general ledger.</p>
        </div>
        <button
          onClick={() => {
            setCnNumber(`CN-2026-000${notes.length + 1}`);
            setShowModal(true);
          }}
          className="py-2 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white shadow-sm font-semibold flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Issue Credit Note
        </button>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Credit Notes List */}
      <div className="p-6 rounded border border-[#e1e5eb] bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#1a2d3c] flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#00b7e2]" />
          Credit Note Registry
        </h3>

        {loading ? (
          <div className="text-slate-400 text-xs text-center py-8">Loading credit notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-8">No credit notes issued.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {notes.map((note) => (
              <div key={note.id} className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-300 rounded flex items-center justify-between text-xs transition-all hover:shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-600 text-sm">{note.creditNoteNumber}</span>
                    {note.invoice && (
                      <span className="text-[10px] text-slate-400">Ref Invoice: {note.invoice.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400">
                    <span>Customer: <strong className="text-slate-600">{note.customerName}</strong></span>
                    <span>Item: <strong className="text-slate-600">{getTranslatedName(note.lines[0]?.stockItem?.nameJson)} ({note.lines[0]?.quantity} units)</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right min-w-[100px]">
                    <span className="block text-sm font-bold text-[#1a2d3c]">{formatMoney(note.totalGross)}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">Ex VAT: {formatMoney(note.totalNet)}</span>
                  </div>

                  <div className="min-w-[120px] text-right">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-250 uppercase">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Applied / GL Posted
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issuance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-5 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3">Issue Credit Note Ledger Reversal</h3>
            
            <form onSubmit={handleCreateCN} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Credit Note #</label>
                  <input
                    type="text"
                    required
                    value={cnNumber}
                    onChange={(e) => setCnNumber(e.target.value)}
                    placeholder="CN-2026-0001"
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2]"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Reference Invoice (Optional)</label>
                <select
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    const selectedInv = invoices.find(inv => String(inv.id) === String(e.target.value));
                    if (selectedInv) {
                      setCustomerName(selectedInv.customerName);
                    }
                  }}
                  className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none"
                >
                  <option value="">No Invoice Link</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-50 border border-[#ccd3db] rounded space-y-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Reversal Details</span>
                
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Product</label>
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded"
                  >
                    {stockList.map((item) => (
                      <option key={item.id} value={item.id}>{item.sku} - {getTranslatedName(item.name)}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Quantity</label>
                    <input
                      type="number"
                      required
                      value={lineQty}
                      onChange={(e) => setLineQty(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Unit Price</label>
                    <input
                      type="number"
                      required
                      value={linePrice}
                      onChange={(e) => setLinePrice(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-2 py-1.5 bg-white border border-[#ccd3db] rounded"
                    >
                      <option value="0.20">20% Standard</option>
                      <option value="0.05">5% Reduced</option>
                      <option value="0.00">0% Zero-Rate</option>
                    </select>
                  </div>
                </div>
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Post Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
