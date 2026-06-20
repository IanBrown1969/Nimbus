"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Loader2 } from "lucide-react";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}

export default function AddSupplierModal({
  isOpen,
  onClose,
  token,
  onSuccess,
}: AddSupplierModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setAddress("");
      setCurrency("GBP");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Supplier Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        "http://localhost:5000/api/finance/suppliers",
        {
          name: name.trim(),
          email: email.trim(),
          address: address.trim(),
          defaultCurrencyCode: currency
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        "Failed to create new supplier. Please check the fields and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600 animate-pulse" /> Add New Supplier Card
        </h3>
        
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAddSupplier} className="space-y-4">
          {/* Supplier Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Supplier Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Lumber Suppliers"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 transition-colors"
              required
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sales@acmelumber.com"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 transition-colors"
              required
            />
          </div>

          {/* Registered Address */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Physical / Postal Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 50 Timber Lane, Bristol, BS1 1AB"
              rows={3}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 transition-colors resize-none"
              required
            />
          </div>

          {/* Default Currency */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Default Billing Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:border-violet-500 text-slate-850"
            >
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Register Supplier</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
