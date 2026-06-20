"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Coins, 
  Calendar, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Search,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";

interface POLine {
  stockItemId: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const { token, user, activeLanguage, activeCurrency, plugins } = useApp();

  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<POLine[]>([
    { stockItemId: "", quantity: 10, unitPrice: 1.0 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSupActive = plugins.find(p => p.code === "SUP")?.isSubscribed;

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, plugins]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Purchase Orders
      const ordersRes = await axios.get("http://localhost:5000/api/finance/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(ordersRes.data);

      // 2. Get Suppliers list
      const suppliersRes = await axios.get("http://localhost:5000/api/finance/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(suppliersRes.data);

      // 3. Get Stock/Products Catalogue
      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(stockRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load purchase orders data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSupplierId(sId);
    const chosenSupplier = suppliers.find(s => String(s.id) === String(sId));
    if (chosenSupplier) {
      setCurrency(chosenSupplier.defaultCurrencyCode || "GBP");
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { stockItemId: "", quantity: 10, unitPrice: 1.0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof POLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      [field]: value
    };

    // Auto-update price when product changes
    if (field === "stockItemId") {
      const selectedItem = stockList.find(item => String(item.id) === String(value));
      if (selectedItem) {
        newLines[index].unitPrice = selectedItem.basePrice || 0;
      }
    }

    setLines(newLines);
  };

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Basic Validation
    if (!supplierId) {
      setError("Please select a supplier.");
      setSubmitting(false);
      return;
    }
    if (lines.some(l => !l.stockItemId || l.quantity <= 0 || l.unitPrice < 0)) {
      setError("Please ensure all line items have a valid product, quantity > 0, and non-negative price.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        orderNumber,
        supplierId: Number(supplierId),
        orderDate: new Date(orderDate).toISOString(),
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: lines.map(l => ({
          stockItemId: Number(l.stockItemId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice)
        }))
      };

      await axios.post("http://localhost:5000/api/finance/purchase-orders", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setSupplierId("");
      setLines([{ stockItemId: "", quantity: 10, unitPrice: 1.0 }]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create purchase order.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (val: number, curr = activeCurrency) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: curr
    }).format(val);
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return { text: "Draft", style: "bg-slate-100 border-slate-200 text-slate-650 font-bold" };
      case 1:
        return { text: "Approved", style: "bg-blue-50 border-blue-200 text-blue-600 font-bold" };
      case 2:
        return { text: "Ordered", style: "bg-purple-50 border-purple-200 text-purple-650 font-bold" };
      case 3:
        return { text: "Received", style: "bg-emerald-50 border-emerald-200 text-emerald-650 font-bold" };
      case 4:
        return { text: "Cancelled", style: "bg-rose-50 border-rose-200 text-rose-600 font-bold" };
      default:
        return { text: "Unknown", style: "bg-slate-50 border-slate-200 text-slate-500 font-bold" };
    }
  };

  const getTranslatedName = (nameJsonStr: string) => {
    try {
      const translations = JSON.parse(nameJsonStr);
      return translations["en-GB"] || nameJsonStr;
    } catch {
      return nameJsonStr;
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.supplier?.name.toLowerCase().includes(q) ||
      o.currencyCode.toLowerCase().includes(q)
    );
  });

  if (!isSupActive) {
    return (
      <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="max-w-md p-6 bg-white border border-slate-250 rounded-2xl text-center space-y-4 shadow-md">
          <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Supplier & Purchasing (SUP) Locked</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Access to supplier records, purchase order lists, and goods receipt tracking requires the **SUP Add-on Plugin**. Please subscribe to the plugin in Settings to unlock this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500 fill-emerald-500" /> Procurement Hub
          </span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Purchase Orders</h2>
          <p className="text-slate-500 text-xs mt-1">Issue, review, and track procurement orders to vendors. Receipt deliveries under Warehouse Goods-In.</p>
        </div>
        
        <button
          onClick={() => {
            setOrderNumber(`PO-2026-000${orders.length + 1}`);
            setSupplierId("");
            setCurrency("GBP");
            setExchangeRate(1.0);
            setLines([{ stockItemId: "", quantity: 10, unitPrice: 1.0 }]);
            setShowModal(true);
          }}
          className="py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-555 text-white font-semibold flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-600/10"
        >
          <Plus className="w-4 h-4" /> Raise Purchase Order
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-450 focus:outline-none focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-emerald-50/50 border border-emerald-100/50 rounded-xl px-3 py-1.5 shrink-0">
          <Info className="w-3.5 h-3.5 text-emerald-600" />
          <span>Enforces strict Segregation of Duties checks during receipt.</span>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white border border-[#e1e5eb] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-slate-450 text-xs text-center py-12 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading purchase orders catalogue...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-slate-450 text-xs text-center py-12">
            {searchQuery ? "No purchase orders match your search." : "No purchase orders have been drafted yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-[#e1e5eb]">
                  <th className="py-3 px-4">PO Ref / Date</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Summary Lines</th>
                  <th className="py-3 px-4 text-right">Total (PO Currency)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const totalAmount = order.lines.reduce((sum: number, line: any) => sum + (line.quantity * line.unitPrice), 0);
                  const isCreator = String(order.createdByUserId) === String(user?.id);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-4 font-medium">
                        <div className="font-mono text-emerald-600 font-bold text-sm leading-none">{order.orderNumber}</div>
                        <span className="text-[10px] text-slate-450 mt-1 block">
                          {new Date(order.orderDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" })}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {order.supplier?.name || "N/A"}
                        <span className="block text-[9px] text-slate-400 font-normal mt-0.5">{order.supplier?.email}</span>
                      </td>
                      <td className="py-4 px-4 max-w-xs truncate text-[11px] text-slate-550">
                        {order.lines.map((line: any, i: number) => (
                          <div key={i} className="truncate">
                            • {getTranslatedName(line.stockItem?.nameJson)} ({line.quantity} units @ {formatMoney(line.unitPrice, order.currencyCode)})
                          </div>
                        ))}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        {formatMoney(totalAmount, order.currencyCode)}
                        {order.currencyCode !== "GBP" && (
                          <span className="block text-[9px] font-normal text-slate-450 mt-0.5">
                            Rate: {order.exchangeRateToBase}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded border text-[9px] uppercase tracking-wide inline-block ${badge.style}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {order.status === 0 ? (
                          isCreator ? (
                            <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 font-semibold flex items-center justify-end w-fit ml-auto gap-1">
                              <Info className="w-3 h-3" /> Creator Restricted Receipt
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 font-semibold flex items-center justify-end w-fit ml-auto gap-1">
                              Ready for Goods-In <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-end gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" /> Raise New Purchase Order
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Supplier / Vendor</label>
                  <select
                    value={supplierId}
                    onChange={handleSupplierChange}
                    required
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Choose Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.defaultCurrencyCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Order Date</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">PO Order Number</label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="PO-2026-0001"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Currency</label>
                    <input
                      type="text"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Exchange Rate</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 border border-emerald-200 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 relative">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[8px] font-bold uppercase text-slate-400">SKU / Product</label>
                        <select
                          value={line.stockItemId}
                          onChange={(e) => handleLineChange(idx, "stockItemId", e.target.value)}
                          required
                          className="w-full mt-0.5 text-xs px-2 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                        >
                          <option value="">Choose Catalog Item</option>
                          {stockList.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {getTranslatedName(item.nameJson)} ({formatMoney(item.basePrice || 0, "GBP")})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <label className="text-[8px] font-bold uppercase text-slate-400">Quantity</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                          className="w-full mt-0.5 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[8px] font-bold uppercase text-slate-400">Unit Price ({currency})</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                          className="w-full mt-0.5 text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="text-rose-500 hover:text-rose-600 disabled:opacity-30 mt-3 p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>Estimated PO Value:</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatMoney(lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0), currency)}
                </span>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting Order...
                    </>
                  ) : (
                    "Confirm & Save Draft"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
