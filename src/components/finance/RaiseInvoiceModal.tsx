"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Percent } from "lucide-react";
import SearchableCustomerDropdown from "../common/SearchableCustomerDropdown";

interface RaiseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  stockList: any[];
  activeLanguage: string;
  onSuccess: () => void;
}

export default function RaiseInvoiceModal({
  isOpen,
  onClose,
  token,
  stockList,
  onSuccess,
}: RaiseInvoiceModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  
  const [selectedStockId, setSelectedStockId] = useState("");
  const [lineQty, setLineQty] = useState(10);
  const [linePrice, setLinePrice] = useState(15.0);
  const [vatRate, setVatRate] = useState(0.20); // 20% Standard UK VAT
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerName("");
      setInvoiceNumber("");
      setCurrency("GBP");
      setExchangeRate(1.0);
      setLineQty(10);
      setLinePrice(15.0);
      setVatRate(0.20);
      setSelectedCustomer(null);

      // Fetch customers
      axios.get("http://localhost:5000/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setCustomers(res.data);
      }).catch(err => {
        console.error("Failed to load customers", err);
      });

      // Default dates
      const todayStr = new Date().toISOString().split("T")[0];
      setInvoiceDate(todayStr);
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      setDueDate(defaultDueDate.toISOString().split("T")[0]);

      if (stockList.length > 0) {
        setSelectedStockId(stockList[0].id.toString());
      } else {
        setSelectedStockId("");
      }
    }
  }, [isOpen, stockList, token]);

  const calculateDueDate = (dateStr: string, termDays: number) => {
    if (!dateStr) return "";
    const baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) return "";
    baseDate.setDate(baseDate.getDate() + termDays);
    return baseDate.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (invoiceDate) {
      const term = selectedCustomer?.creditContractDays || 30;
      setDueDate(calculateDueDate(invoiceDate, term));
    }
  }, [invoiceDate, selectedCustomer]);

  if (!isOpen) return null;

  const getTranslatedName = (nameJsonStr: string) => {
    try {
      const translations = JSON.parse(nameJsonStr);
      return translations["en-GB"] || nameJsonStr;
    } catch {
      return nameJsonStr;
    }
  };

  const handlePostInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvoice(true);
    setError(null);
    try {
      const payload = {
        invoiceNumber,
        customerName,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
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

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post invoice.");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
        <h3 className="text-base font-bold text-slate-900">Issue Sales Tax Invoice</h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handlePostInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Invoice Number</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-0002"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-850"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Customer Name</label>
              <SearchableCustomerDropdown
                customers={customers}
                value={customerName}
                onChange={(name, customer) => {
                  setCustomerName(name);
                  if (customer) {
                    setSelectedCustomer(customer);
                    setCurrency(customer.defaultCurrencyCode);
                    setExchangeRate(customer.defaultCurrencyCode === "GBP" ? 1.0 : (customer.defaultCurrencyCode === "USD" ? 1.25 : 1.15));
                  } else {
                    setSelectedCustomer(null);
                  }
                }}
                placeholder="Builders Depot Ltd"
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
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-855"
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
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-855"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Invoice Date</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-855"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Due Date (Auto Shift)</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-855 font-semibold text-slate-700"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="block text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-violet-600" /> Invoice Line Item Details
            </span>
            
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-500">Select Product</label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-sans"
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
                  className="w-full mt-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-700"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500">Unit Price</label>
                <input
                  type="number"
                  value={linePrice}
                  onChange={(e) => setLinePrice(Number(e.target.value))}
                  className="w-full mt-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-700"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="w-full mt-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-700"
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
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingInvoice}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              Post Invoices & Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
