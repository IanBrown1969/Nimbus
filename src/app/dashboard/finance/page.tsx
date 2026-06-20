"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Receipt, 
  BookOpen, 
  Coins, 
  ShoppingBag, 
  Users, 
  Lock, 
  Plus, 
  Scale, 
  CheckCircle2, 
  Percent,
  Landmark
} from "lucide-react";

export default function FinancePage() {
  const { token, plugins, user, activeLanguage, activeCurrency } = useApp();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  
  // SUP items
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // Bank feeds
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Form states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  
  // Stock list for line selector
  const [stockList, setStockList] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [lineQty, setLineQty] = useState(10);
  const [linePrice, setLinePrice] = useState(15.0);
  const [vatRate, setVatRate] = useState(0.20); // 20% Standard UK VAT

  // Pay Invoice modal states
  const [showPayInvoiceModal, setShowPayInvoiceModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [payingInvoice, setPayingInvoice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupActive = plugins.find(p => p.code === "SUP")?.isSubscribed;

  useEffect(() => {
    if (token) {
      fetchFinanceData();
    }
  }, [token, plugins]);

  const fetchFinanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Invoices
      const invoiceRes = await axios.get("http://localhost:5000/api/finance/invoices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(invoiceRes.data);

      // 2. Get General Ledger entries
      const ledgerRes = await axios.get("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLedger(ledgerRes.data);

      // 3. Get Stock Items (needed for invoice line options)
      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(stockRes.data);
      if (stockRes.data.length > 0) {
        setSelectedStockId(stockRes.data[0].id);
      }

      // 4. Get Suppliers & POs if SUP plugin is active
      if (isSupActive) {
        const suppliersRes = await axios.get("http://localhost:5000/api/finance/suppliers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuppliers(suppliersRes.data);

        const posRes = await axios.get("http://localhost:5000/api/finance/purchase-orders", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchaseOrders(posRes.data);
      } else {
        setSuppliers([]);
        setPurchaseOrders([]);
      }

      // 5. Get Bank accounts
      const bankRes = await axios.get("http://localhost:5000/api/finance/bank/feeds", {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => axios.get("http://localhost:5000/api/finance/bank/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      }));
      setBankAccounts(bankRes.data);
      if (bankRes.data.length > 0) {
        setSelectedBankId(bankRes.data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        invoiceNumber,
        customerName,
        invoiceDate: new Date().toISOString(),
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: [
          {
            stockItemId: selectedStockId,
            quantity: Number(lineQty),
            unitPrice: Number(linePrice),
            taxRate: Number(vatRate)
          }
        ]
      };

      await axios.post("http://localhost:5000/api/finance/invoices", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowInvoiceModal(false);
      setCustomerName("");
      setInvoiceNumber("");
      fetchFinanceData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post invoice.");
    }
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoiceId) return;
    setPayingInvoice(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/finance/invoices/${selectedInvoiceId}/pay`, {
        bankAccountId: selectedBankId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPayInvoiceModal(false);
      setSelectedInvoiceId(null);
      fetchFinanceData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to receive customer payment.");
    } finally {
      setPayingInvoice(false);
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
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-100">Accounting Ledger</h2>
          <p className="text-slate-400 text-sm mt-1">Raise VAT invoices, configure multi-currency conversions, and track general ledger journals.</p>
        </div>
        {(user?.role === "CompanyAdmin" || user?.role === "Accounts") && (
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Raise Tax Invoice
          </button>
        )}
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link href="/dashboard/finance/accounts" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Ledger Accounts</span>
          <span className="text-[9px] text-slate-500 block mt-1">Chart of Accounts</span>
        </Link>
        <Link href="/dashboard/finance/sales-orders" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Sales Orders</span>
          <span className="text-[9px] text-slate-500 block mt-1">Draft & Approve SO</span>
        </Link>
        <Link href="/dashboard/finance/supplier-bills" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Supplier Bills</span>
          <span className="text-[9px] text-slate-500 block mt-1">AP & Vendor Payments</span>
        </Link>
        <Link href="/dashboard/finance/credit-notes" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Credit Notes</span>
          <span className="text-[9px] text-slate-500 block mt-1">Sales Adjustments</span>
        </Link>
        <Link href="/dashboard/finance/vat" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">VAT Returns</span>
          <span className="text-[9px] text-slate-500 block mt-1">HMRC 9-Boxes</span>
        </Link>
        <Link href="/dashboard/finance/bank" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Bank Feeds</span>
          <span className="text-[9px] text-slate-500 block mt-1">Match & Reconcile</span>
        </Link>
        <Link href="/dashboard/finance/payroll" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Payroll runs</span>
          <span className="text-[9px] text-slate-500 block mt-1">Slips & PAYE tax</span>
        </Link>
        <Link href="/dashboard/finance/claims" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Expense claims</span>
          <span className="text-[9px] text-slate-500 block mt-1">Receipt approvals</span>
        </Link>
        <Link href="/dashboard/finance/assets" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Fixed Assets</span>
          <span className="text-[9px] text-slate-500 block mt-1">Depreciation schedules</span>
        </Link>
        <Link href="/dashboard/finance/quotes" className="p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center transition-all group">
          <span className="block text-xs font-bold text-slate-200 group-hover:text-violet-400">Quotes & Est.</span>
          <span className="text-[9px] text-slate-500 block mt-1">Customer proposals</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Invoices and Journal post blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Sales Invoices List */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-violet-400" />
            Customer Billing Invoices
          </h3>

          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No invoices issued. Create one to begin.</div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                  <div>
                    <span className="font-mono font-bold text-violet-400 block">{inv.invoiceNumber}</span>
                    <span className="text-slate-400 block mt-0.5">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Date: {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block font-bold text-slate-200">{formatMoney(inv.totalGross, inv.currencyCode)}</span>
                      {inv.currencyCode !== "GBP" && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">Rate: {inv.exchangeRateToBase}</span>
                      )}
                      <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        inv.status === "Paid" || inv.status === 2
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : "text-amber-400 bg-amber-950/20 border-amber-900/40"
                      }`}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> {inv.status === "Paid" || inv.status === 2 ? "Paid" : "Issued"}
                      </span>
                    </div>
                    {(inv.status === "Issued" || inv.status === 1) && (
                      <button
                        onClick={() => {
                          setSelectedInvoiceId(inv.id);
                          setShowPayInvoiceModal(true);
                        }}
                        className="py-1.5 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Landmark className="w-3 h-3" /> Receive Pay
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* General Ledger Postings */}
        <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              General Ledger (UK HMRC Double-Entry)
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded uppercase">
              <Scale className="w-3 h-3" /> Balanced
            </span>
          </h3>

          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 divide-y divide-slate-850">
            {ledger.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No journal entry postings recorded.</div>
            ) : (
              ledger.map((entry) => (
                <div key={entry.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{entry.description}</span>
                    <span className="font-mono text-slate-400">{entry.reference}</span>
                  </div>
                  
                  {/* Ledger Lines */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                    {entry.lines.map((line: any) => (
                      <div key={line.id} className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400 w-1/3">Acc: {line.AccountCode}</span>
                        <span className="text-emerald-400 text-right w-1/3">
                          {line.debit > 0 ? `DR ${formatMoney(line.debit, "GBP")}` : ""}
                        </span>
                        <span className="text-violet-400 text-right w-1/3">
                          {line.credit > 0 ? `CR ${formatMoney(line.credit, "GBP")}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Supplier & Procurement module checks */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              Supplier Procurement (SUP Plugin)
            </span>
            {!isSupActive && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-950 border border-rose-800 text-rose-400 rounded flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked Add-on
              </span>
            )}
          </h3>

          {isSupActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Suppliers List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" /> Suppliers Directory
                </h4>
                {suppliers.length === 0 ? (
                  <div className="text-slate-600 text-xs italic">No suppliers defined.</div>
                ) : (
                  suppliers.map(s => (
                    <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between">
                      <div>
                        <strong className="block text-slate-200">{s.name}</strong>
                        <span className="block text-slate-500 text-[10px] mt-0.5">{s.email}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">{s.defaultCurrencyCode}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Purchase Orders List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-violet-400" /> Purchase Orders
                </h4>
                {purchaseOrders.length === 0 ? (
                  <div className="text-slate-600 text-xs italic">No purchase orders drafted.</div>
                ) : (
                  purchaseOrders.map(po => (
                    <div key={po.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <strong className="block text-slate-200">{po.orderNumber}</strong>
                        <span className="block text-slate-500 text-[10px] mt-0.5">{po.supplier.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 border border-cyan-850 rounded">
                        {po.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
              <Lock className="w-8 h-8 text-slate-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-400">Supplier Procurement System Locked</h4>
                <p className="text-[10px] text-slate-500 max-w-[400px] mt-1">Activate the Supplier & Purchasing Management plugin (SUP) in settings to enable vendor records, purchase orders, and goods received note tracking.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-100">Issue Sales Tax Invoice</h3>
            
            <form onSubmit={handlePostInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2026-0002"
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
                    placeholder="Builders Depot Ltd"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <span className="block text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-violet-400" /> Invoice Line Item Details
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
                    <label className="text-[9px] font-bold uppercase text-slate-500">Selling Qty</label>
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
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
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
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                >
                  Post Invoices & Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Pay Invoice Modal */}
      {showPayInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-violet-400" /> Receive Customer Payment
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Target Bank Account</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-250 font-sans"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountName} (Balance: {formatMoney(b.currentBalance)})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayInvoiceModal(false);
                    setSelectedInvoiceId(null);
                  }}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-250 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayInvoice}
                  disabled={payingInvoice}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
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
