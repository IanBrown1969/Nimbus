"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Landmark } from "lucide-react";

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  invoiceId: string | null;
  bankAccounts: any[];
  activeLanguage: string;
  activeCurrency: string;
  onSuccess: () => void;
}

export default function PayInvoiceModal({
  isOpen,
  onClose,
  token,
  invoiceId,
  bankAccounts,
  activeLanguage,
  activeCurrency,
  onSuccess,
}: PayInvoiceModalProps) {
  const [selectedBankId, setSelectedBankId] = useState("");
  const [payingInvoice, setPayingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (bankAccounts.length > 0) {
        setSelectedBankId(bankAccounts[0].id.toString());
      } else {
        setSelectedBankId("");
      }
    }
  }, [isOpen, bankAccounts]);

  if (!isOpen || !invoiceId) return null;

  const formatMoney = (val: number, curr = activeCurrency) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: curr
    }).format(val);
  };

  const handlePayInvoice = async () => {
    setPayingInvoice(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/finance/invoices/${invoiceId}/pay`, {
        bankAccountId: selectedBankId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to receive customer payment.");
    } finally {
      setPayingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-violet-600" /> Receive Customer Payment
        </h3>
        
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Target Bank Account</label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-850 font-sans"
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.accountName} (Balance: {formatMoney(b.currentBalance)})</option>
              ))}
            </select>
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
              type="button"
              onClick={handlePayInvoice}
              disabled={payingInvoice}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
