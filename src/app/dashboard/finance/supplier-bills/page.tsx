"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Receipt, Plus, CheckCircle, ArrowRight, Loader2, Landmark } from "lucide-react";

export default function SupplierBillsPage() {
  const { token, activeLanguage, activeCurrency } = useApp();

  const [bills, setBills] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [billNumber, setBillNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [net, setNet] = useState(100.00);
  const [tax, setTax] = useState(20.00);
  const [submitting, setSubmitting] = useState(false);

  // Pay modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const billsRes = await axios.get("http://localhost:5000/api/finance/bills", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(billsRes.data);

      const supRes = await axios.get("http://localhost:5000/api/finance/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(supRes.data);
      if (supRes.data.length > 0) {
        setSupplierId(supRes.data[0].id);
      }

      const poRes = await axios.get("http://localhost:5000/api/finance/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPurchaseOrders(poRes.data);

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
      setError(err.response?.data?.message || "Failed to load supplier bills.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        billNumber,
        purchaseOrderId: poId === "" ? null : poId,
        supplierId,
        date: new Date().toISOString(),
        dueDate: dueDate === "" ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : new Date(dueDate).toISOString(),
        totalNet: Number(net),
        totalTax: Number(tax)
      };

      await axios.post("http://localhost:5000/api/finance/bills", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setBillNumber("");
      setPoId("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record vendor bill.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayBill = async () => {
    if (!selectedBillId) return;
    setPaying(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/finance/bills/${selectedBillId}/pay`, {
        bankAccountId: selectedBankId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPayModal(false);
      setSelectedBillId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post payment.");
    } finally {
      setPaying(false);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency
    }).format(val);
  };

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest">Finance</span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Supplier Bills</h2>
          <p className="text-slate-500 text-xs mt-1">Record supplier invoices, track payment dates, and execute bank payments to clear liabilities.</p>
        </div>
        <button
          onClick={() => {
            setBillNumber(`BILL-${Date.now().toString().substring(8)}`);
            setShowModal(true);
          }}
          className="py-2 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white shadow-sm font-semibold flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Record Supplier Bill
        </button>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Bills list */}
      <div className="p-6 rounded border border-[#e1e5eb] bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#1a2d3c] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#00b7e2]" />
          Accounts Payable Vendor Bills
        </h3>

        {loading ? (
          <div className="text-slate-400 text-xs text-center py-8">Loading supplier bills...</div>
        ) : bills.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-8">No supplier bills recorded.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {bills.map((bill) => (
              <div key={bill.id} className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-300 rounded flex items-center justify-between text-xs transition-all hover:shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-sm">{bill.billNumber}</span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${bill.status === 1 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      {bill.status === 1 ? "Paid" : "Awaiting Payment"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-450">
                    <span>Supplier: <strong className="text-slate-600">{bill.supplier?.name}</strong></span>
                    <span>Due: <strong className="text-slate-600">{new Date(bill.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right min-w-[100px]">
                    <span className="block text-sm font-bold text-[#1a2d3c]">{formatMoney(bill.totalGross)}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">Ex VAT: {formatMoney(bill.totalNet)}</span>
                  </div>

                  <div className="min-w-[120px] text-right">
                    {bill.status === 0 ? (
                      <button
                        onClick={() => {
                          setSelectedBillId(bill.id);
                          setShowPayModal(true);
                        }}
                        className="py-1 px-3 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Pay Bill</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Payment Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-5 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3">Record Supplier Bill</h3>
            
            <form onSubmit={handleRecordBill} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Bill Number / Ref</label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="INV-VENDOR-992"
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Supplier</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Purchase Order Ref</label>
                  <select
                    value={poId}
                    onChange={(e) => setPoId(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded"
                  >
                    <option value="">No PO reference</option>
                    {purchaseOrders.map(p => (
                      <option key={p.id} value={p.id}>{p.orderNumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-[#ccd3db] rounded">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Net Amount</label>
                  <input
                    type="number"
                    required
                    value={net}
                    onChange={(e) => setNet(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">VAT Tax Amount</label>
                  <input
                    type="number"
                    required
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded"
                  />
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
                  className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Record Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-sm p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-4 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#00b7e2]" /> Choose Bank Account
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Bank Source</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded text-slate-800"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountName} (Balance: {formatMoney(b.currentBalance)})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e1e5eb]">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-[#ccd3db] text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayBill}
                  disabled={paying}
                  className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Execute Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
