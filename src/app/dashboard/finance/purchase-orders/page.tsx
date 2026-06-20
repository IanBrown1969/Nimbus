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
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [lines, setLines] = useState<POLine[]>([
    { stockItemId: "", quantity: 10, unitPrice: 1.0 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer states
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<string>("orderNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Column filtering states
  const [filterPO, setFilterPO] = useState("");
  const [filterOrderDate, setFilterOrderDate] = useState("");
  const [filterExpectedDate, setFilterExpectedDate] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterLines, setFilterLines] = useState("");
  const [filterTotal, setFilterTotal] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortHeader = (label: string, field: string, align: "left" | "center" | "right" = "left") => {
    const isSorted = sortField === field;
    return (
      <div 
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 cursor-pointer select-none hover:text-slate-800 transition-colors ${
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span>{label}</span>
        <span className="text-[9px] text-slate-400 font-bold font-mono">
          {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </div>
    );
  };

  const clearAllFilters = () => {
    setFilterPO("");
    setFilterOrderDate("");
    setFilterExpectedDate("");
    setFilterSupplier("");
    setFilterLines("");
    setFilterTotal("");
    setFilterStatus("All");
  };

  const hasFilters = !!(
    filterPO ||
    filterOrderDate ||
    filterExpectedDate ||
    filterSupplier ||
    filterLines ||
    filterTotal ||
    filterStatus !== "All"
  );

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
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
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

  const getLinesText = (order: any) => {
    return order.lines.map((line: any) => {
      const name = getTranslatedName(line.stockItem?.nameJson) || "";
      return `• ${name} (${line.quantity} units @ ${formatMoney(line.unitPrice, order.currencyCode)})`;
    }).join(" ");
  };

  const getOrderStatusText = (status: number) => {
    switch (status) {
      case 0: return "Draft";
      case 1: return "Approved";
      case 2: return "Ordered";
      case 3: return "Received";
      case 4: return "Cancelled";
      default: return "Unknown";
    }
  };

  const getOrderTotal = (order: any) => {
    return order.lines.reduce((sum: number, line: any) => sum + (line.quantity * line.unitPrice), 0);
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = q ? (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.supplier?.name || "").toLowerCase().includes(q) ||
      o.currencyCode.toLowerCase().includes(q)
    ) : true;

    if (!matchesSearch) return false;

    if (filterPO && !o.orderNumber.toLowerCase().includes(filterPO.toLowerCase())) {
      return false;
    }

    if (filterOrderDate) {
      const dateStr = new Date(o.orderDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" }).toLowerCase();
      if (!dateStr.includes(filterOrderDate.toLowerCase())) {
        return false;
      }
    }

    if (filterExpectedDate) {
      if (!o.expectedDeliveryDate) return false;
      const dateStr = new Date(o.expectedDeliveryDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" }).toLowerCase();
      if (!dateStr.includes(filterExpectedDate.toLowerCase())) {
        return false;
      }
    }

    if (filterSupplier && !(o.supplier?.name || "").toLowerCase().includes(filterSupplier.toLowerCase())) {
      return false;
    }

    if (filterLines && !getLinesText(o).toLowerCase().includes(filterLines.toLowerCase())) {
      return false;
    }

    if (filterTotal) {
      const totalAmount = getOrderTotal(o);
      const totalStr = formatMoney(totalAmount, o.currencyCode).toLowerCase();
      if (!totalStr.includes(filterTotal.toLowerCase()) && !totalAmount.toString().includes(filterTotal)) {
        return false;
      }
    }

    if (filterStatus !== "All") {
      const statusText = getOrderStatusText(o.status);
      if (statusText.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "orderNumber":
        comparison = a.orderNumber.localeCompare(b.orderNumber);
        break;
      case "orderDate":
        comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        break;
      case "expectedDeliveryDate":
        const dateA = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate).getTime() : 0;
        const dateB = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate).getTime() : 0;
        comparison = dateA - dateB;
        break;
      case "supplier":
        const nameA = a.supplier?.name || "";
        const nameB = b.supplier?.name || "";
        comparison = nameA.localeCompare(nameB);
        break;
      case "lines":
        const textA = getLinesText(a);
        const textB = getLinesText(b);
        comparison = textA.localeCompare(textB);
        break;
      case "total":
        comparison = getOrderTotal(a) - getOrderTotal(b);
        break;
      case "status":
        comparison = getOrderStatusText(a.status).localeCompare(getOrderStatusText(b.status));
        break;
      default:
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
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
        ) : sortedOrders.length === 0 ? (
          <div className="text-slate-450 text-xs text-center py-12">
            {searchQuery || hasFilters ? "No purchase orders match your filters." : "No purchase orders have been drafted yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-[#e1e5eb] select-none">
                  <th className="py-3 px-4">{renderSortHeader("PO Ref", "orderNumber")}</th>
                  <th className="py-3 px-4">{renderSortHeader("Order Date", "orderDate")}</th>
                  <th className="py-3 px-4">{renderSortHeader("Expected Delivery", "expectedDeliveryDate")}</th>
                  <th className="py-3 px-4">{renderSortHeader("Supplier Name", "supplier")}</th>
                  <th className="py-3 px-4">{renderSortHeader("Summary Lines", "lines")}</th>
                  <th className="py-3 px-4 text-right">{renderSortHeader("Total (PO Currency)", "total", "right")}</th>
                  <th className="py-3 px-4 text-center">{renderSortHeader("Status", "status", "center")}</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
                {/* Filter row */}
                <tr className="bg-slate-50/20 border-b border-[#e1e5eb]">
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter PO..."
                      value={filterPO}
                      onChange={(e) => setFilterPO(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter Date..."
                      value={filterOrderDate}
                      onChange={(e) => setFilterOrderDate(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter Expected..."
                      value={filterExpectedDate}
                      onChange={(e) => setFilterExpectedDate(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter Supplier..."
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter Items..."
                      value={filterLines}
                      onChange={(e) => setFilterLines(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Filter Total..."
                      value={filterTotal}
                      onChange={(e) => setFilterTotal(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded text-right focus:outline-none focus:border-emerald-600 font-sans"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-[10px] px-1 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-sans"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Approved">Approved</option>
                      <option value="Ordered">Ordered</option>
                      <option value="Received">Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    {hasFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="py-1 px-2 text-[9px] text-rose-600 hover:text-rose-700 font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100/50 rounded transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const totalAmount = getOrderTotal(order);
                  const isCreator = String(order.createdByUserId) === String(user?.id);

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => { setSelectedPO(order); setDrawerOpen(true); }}
                      className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-mono text-emerald-600 font-bold text-sm leading-none">
                        {order.orderNumber}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-600">
                        {new Date(order.orderDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" })}
                      </td>
                      <td className="py-4 px-4 font-medium">
                        {order.expectedDeliveryDate ? (
                          <span className="text-amber-600 font-bold">
                            {new Date(order.expectedDeliveryDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
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

                <div className="grid grid-cols-2 gap-3">
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
                    <label className="text-[10px] font-bold uppercase text-slate-500">Expected Delivery</label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
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

      {/* PO Details Drawer */}
      {drawerOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => { setDrawerOpen(false); setSelectedPO(null); }}></div>
          <div className="relative w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl h-screen flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Purchase Order Details</span>
                <h3 className="text-base font-bold text-slate-800 font-mono mt-1">{selectedPO.orderNumber}</h3>
              </div>
              <button 
                onClick={() => { setDrawerOpen(false); setSelectedPO(null); }}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-450 hover:text-slate-650 flex items-center justify-center text-sm cursor-pointer transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Status Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="space-y-0.5">
                  <span className="block text-[8px] font-bold uppercase text-slate-400">Order Status</span>
                  <span className={`px-2.5 py-0.5 rounded border text-[9px] uppercase tracking-wide inline-block font-bold ${getStatusBadge(selectedPO.status).style}`}>
                    {getStatusBadge(selectedPO.status).text}
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="block text-[8px] font-bold uppercase text-slate-400">Raised By</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedPO.createdByUser?.username || "System Admin"}
                  </span>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Details</h4>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Supplier Name</span>
                    <span className="text-xs font-bold text-slate-800">{selectedPO.supplier?.name || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Email</span>
                      <span className="text-xs font-semibold text-slate-600 truncate block">{selectedPO.supplier?.email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Default Currency</span>
                      <span className="text-xs font-semibold text-slate-600 block">{selectedPO.supplier?.defaultCurrencyCode || "GBP"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Billing Address</span>
                    <span className="text-xs font-medium text-slate-600 block whitespace-pre-wrap">{selectedPO.supplier?.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* PO Meta Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Meta</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Order Date</span>
                    <span className="text-[11px] font-bold text-slate-800">
                      {new Date(selectedPO.orderDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" })}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Expected Delivery Date</span>
                    <span className={`text-[11px] font-bold ${selectedPO.expectedDeliveryDate ? "text-amber-600" : "text-slate-600"}`}>
                      {selectedPO.expectedDeliveryDate 
                        ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString(activeLanguage, { dateStyle: "medium" }) 
                        : "Not specified"}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Trans Currency</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">{selectedPO.currencyCode}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Exchange Rate</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">{selectedPO.exchangeRateToBase}</span>
                  </div>
                </div>
              </div>

              {/* Lines Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Items</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <th className="py-2.5 px-3">Item SKU</th>
                        <th className="py-2.5 px-3 text-right">Qty Ord</th>
                        <th className="py-2.5 px-3 text-right">Qty Rec</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPO.lines.map((line: any, i: number) => {
                        const isFullyReceived = line.receivedQuantity >= line.quantity;
                        return (
                          <tr key={i} className="hover:bg-slate-50/20">
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-emerald-600 block">{line.stockItem?.sku}</span>
                              <span className="text-[9px] text-slate-450 block truncate max-w-[150px] mt-0.5">
                                {getTranslatedName(line.stockItem?.nameJson)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium">{line.quantity}</td>
                            <td className="py-3 px-3 text-right font-bold">
                              <span className={isFullyReceived ? "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]" : "text-purple-650 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px]"}>
                                {line.receivedQuantity || 0}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium">{formatMoney(line.unitPrice, selectedPO.currencyCode)}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-800">
                              {formatMoney(line.quantity * line.unitPrice, selectedPO.currencyCode)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-800 shrink-0">
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold uppercase text-slate-400">Total Purchase Value</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {formatMoney(selectedPO.lines.reduce((sum: number, l: any) => sum + (l.quantity * l.unitPrice), 0), selectedPO.currencyCode)}
                </span>
              </div>
              <button
                onClick={() => { setDrawerOpen(false); setSelectedPO(null); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
