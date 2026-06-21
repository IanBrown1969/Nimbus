"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Plus } from "lucide-react";

// Components
import InvoicesList from "@/components/finance/InvoicesList";
import LedgerPostings from "@/components/finance/LedgerPostings";
import SupplierProcurement from "@/components/finance/SupplierProcurement";

// Modals
import RaiseInvoiceModal from "@/components/finance/RaiseInvoiceModal";
import PayInvoiceModal from "@/components/finance/PayInvoiceModal";

export default function FinancePage() {
  const { token, plugins, user, activeLanguage, activeCurrency } = useApp();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  
  // SUP items
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // Bank feeds
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);

  // Form modals state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPayInvoiceModal, setShowPayInvoiceModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch finance dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setShowPayInvoiceModal(true);
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
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Accounting Ledger</h2>
          <p className="text-slate-655 text-sm mt-1">Raise VAT invoices, configure multi-currency conversions, and track general ledger journals.</p>
        </div>
        {(user?.role === "CompanyAdmin" || user?.role === "Accounts") && (
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Raise Tax Invoice
          </button>
        )}
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { href: "/dashboard/finance/accounts", label: "Ledger Accounts", desc: "Chart of Accounts" },
          { href: "/dashboard/finance/sales-orders", label: "Sales Orders", desc: "Draft & Approve SO" },
          { href: "/dashboard/finance/supplier-bills", label: "Supplier Bills", desc: "AP & Vendor Payments" },
          { href: "/dashboard/finance/credit-notes", label: "Credit Notes", desc: "Sales Adjustments" },
          { href: "/dashboard/finance/vat", label: "VAT Returns", desc: "HMRC 9-Boxes" },
          { href: "/dashboard/finance/bank", label: "Bank Feeds", desc: "Match & Reconcile" },
          { href: "/dashboard/finance/profit-loss", label: "Profit & Loss", desc: "Income statement" },
          { href: "/dashboard/finance/balance-sheet", label: "Balance Sheet", desc: "Position statement" },
          { href: "/dashboard/finance/payroll", label: "Payroll runs", desc: "Slips & PAYE tax" },
          { href: "/dashboard/finance/claims", label: "Expense claims", desc: "Receipt approvals" },
          { href: "/dashboard/finance/assets", label: "Fixed Assets", desc: "Depreciation schedules" },
          { href: "/dashboard/finance/quotes", label: "Quotes & Est.", desc: "Customer proposals" }
        ].map((navItem) => (
          <Link key={navItem.href} href={navItem.href} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-center transition-all group shadow-sm">
            <span className="block text-xs font-bold text-slate-700 group-hover:text-violet-600">{navItem.label}</span>
            <span className="text-[9px] text-slate-500 block mt-1">{navItem.desc}</span>
          </Link>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Invoices and Journal post blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading && invoices.length === 0 && ledger.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6 col-span-2">Loading finance dashboard...</div>
        ) : (
          <>
            <InvoicesList 
              invoices={invoices} 
              activeCurrency={activeCurrency} 
              activeLanguage={activeLanguage} 
              formatMoney={formatMoney} 
              onPayInvoice={handlePayInvoiceClick} 
            />

            <LedgerPostings 
              ledger={ledger} 
              activeCurrency={activeCurrency} 
              activeLanguage={activeLanguage} 
              formatMoney={formatMoney} 
            />
          </>
        )}
      </div>

      {/* Supplier & Procurement module checks */}
      <SupplierProcurement 
        isSupActive={isSupActive || false} 
        suppliers={suppliers} 
        purchaseOrders={purchaseOrders} 
        onRefresh={fetchFinanceData}
      />

      {/* Modals */}
      <RaiseInvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
        token={token || ""} 
        stockList={stockList} 
        activeLanguage={activeLanguage} 
        onSuccess={fetchFinanceData} 
      />

      <PayInvoiceModal 
        isOpen={showPayInvoiceModal} 
        onClose={() => {
          setShowPayInvoiceModal(false);
          setSelectedInvoiceId(null);
        }} 
        token={token || ""} 
        invoiceId={selectedInvoiceId} 
        bankAccounts={bankAccounts} 
        activeLanguage={activeLanguage} 
        activeCurrency={activeCurrency} 
        onSuccess={fetchFinanceData} 
      />
    </div>
  );
}
