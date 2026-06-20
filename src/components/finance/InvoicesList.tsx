"use client";

import React from "react";
import { Receipt, CheckCircle2, Landmark } from "lucide-react";
import GoldenArrow from "@/components/common/GoldenArrow";

interface InvoicesListProps {
  invoices: any[];
  activeCurrency: string;
  activeLanguage: string;
  formatMoney: (val: number, curr?: string) => string;
  onPayInvoice: (id: string) => void;
}

export default function InvoicesList({
  invoices,
  activeCurrency,
  formatMoney,
  onPayInvoice,
}: InvoicesListProps) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-violet-600" />
        Customer Billing Invoices
      </h3>

      <div className="space-y-3">
        {invoices.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-6">No invoices issued. Create one to begin.</div>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-350 transition-colors">
              <div>
                <span className="font-mono font-bold text-violet-600 flex items-center gap-1.5">
                  <span>{inv.invoiceNumber}</span>
                  <GoldenArrow type="invoice" id={inv.invoiceNumber} />
                </span>
                <span className="text-slate-650 flex items-center mt-0.5">
                  <span>{inv.customerName}</span>
                  <GoldenArrow type="customer" id={inv.customerName} />
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Date: {new Date(inv.invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block font-bold text-slate-800">{formatMoney(inv.totalGross, inv.currencyCode)}</span>
                  {inv.currencyCode !== "GBP" && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">Rate: {inv.exchangeRateToBase}</span>
                  )}
                  <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                    inv.status === "Paid" || inv.status === 2
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> {inv.status === "Paid" || inv.status === 2 ? "Paid" : "Issued"}
                  </span>
                </div>
                {(inv.status === "Issued" || inv.status === 1) && (
                  <button
                    onClick={() => onPayInvoice(inv.id)}
                    className="py-1.5 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
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
  );
}
