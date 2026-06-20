"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Loader2, 
  FileText, 
  ChevronDown,
  Info,
  Sparkles
} from "lucide-react";

interface SalesLine {
  stockItemId: string;
  unitOfSale: "sell" | "stock";
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function SalesOrdersPage() {
  const { token, user, activeLanguage, activeCurrency } = useApp();

  const [orders, setOrders] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);

  // Multi-line items state
  const [lines, setLines] = useState<SalesLine[]>([
    { stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.20 }
  ]);
  
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersRes = await axios.get("http://localhost:5000/api/finance/sales-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(ordersRes.data);

      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(stockRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load sales orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.20 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof SalesLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      [field]: value
    } as SalesLine;

    // Auto-update price when product or unit of sale changes
    if (field === "stockItemId" || field === "unitOfSale") {
      const selectedItem = stockList.find(item => String(item.id) === String(newLines[index].stockItemId));
      if (selectedItem) {
        if (newLines[index].unitOfSale === "stock") {
          newLines[index].unitPrice = selectedItem.basePrice || 0;
        } else {
          const ratio = selectedItem.conversionRatio || 1;
          newLines[index].unitPrice = Number(((selectedItem.basePrice || 0) / ratio).toFixed(4));
        }
      }
    }

    setLines(newLines);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (lines.some(l => !l.stockItemId || l.quantity <= 0 || l.unitPrice < 0)) {
      setError("Please ensure all lines have a valid item selected, quantity > 0, and non-negative price.");
      setSubmitting(false);
      return;
    }

    try {
      const payloadLines = lines.map(line => {
        const prod = stockList.find(item => String(item.id) === String(line.stockItemId));
        const ratio = prod ? (prod.conversionRatio || 1) : 1;

        const qtyToSend = line.unitOfSale === "stock" ? Number(line.quantity) * ratio : Number(line.quantity);
        const priceToSend = line.unitOfSale === "stock" ? Number(line.unitPrice) / ratio : Number(line.unitPrice);

        return {
          stockItemId: Number(line.stockItemId),
          quantity: qtyToSend,
          unitPrice: priceToSend,
          taxRate: Number(line.taxRate)
        };
      });

      const payload = {
        orderNumber,
        customerName,
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: payloadLines
      };

      await axios.post("http://localhost:5000/api/finance/sales-orders", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setCustomerName("");
      setOrderNumber("");
      setLines([{ stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.20 }]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to draft sales order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/finance/sales-orders/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to approve sales order.");
    } finally {
      setProcessingId(null);
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
        return { text: "Draft", style: "bg-slate-100 border-slate-200 text-slate-600" };
      case 1:
        return { text: "Approved", style: "bg-blue-50 border-blue-200 text-blue-600" };
      case 2:
        return { text: "Shipped", style: "bg-purple-50 border-purple-200 text-purple-600" };
      case 3:
        return { text: "Invoiced", style: "bg-emerald-50 border-emerald-200 text-emerald-600" };
      case 4:
        return { text: "Cancelled", style: "bg-rose-50 border-rose-200 text-rose-600" };
      default:
        return { text: "Unknown", style: "bg-slate-50 border-slate-200 text-slate-500" };
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

  return (
    <div className="bg-[#f4f6f8] text-[#334155] -m-6 p-8 min-h-[calc(100vh-4rem)] space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e5eb] pb-5">
        <div>
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#00b7e2] fill-[#00b7e2]" /> Order Management
          </span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Sales Orders</h2>
          <p className="text-slate-500 text-xs mt-1">Record contracts, approve them to trigger warehouse picking, and dispatch shipments to customers.</p>
        </div>
        <button
          onClick={() => {
            setOrderNumber(`SO-2026-000${orders.length + 1}`);
            setCustomerName("");
            setLines([{ stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.20 }]);
            setShowModal(true);
          }}
          className="py-2.5 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer shadow-sm shadow-[#00b7e2]/10"
        >
          <Plus className="w-4 h-4" /> Raise Sales Order
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Orders List Card */}
      <div className="p-6 rounded-2xl border border-[#e1e5eb] bg-white shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#1a2d3c] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00b7e2]" />
          Sales Order Logs
        </h3>

        {loading ? (
          <div className="text-slate-400 text-xs text-center py-8">Loading sales orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-8">No sales orders drafted yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const isAdminOrAccounts = user?.role === "CompanyAdmin" || user?.role === "Accounts" || user?.role === "GlobalAdmin";
              const isCreator = String(order.createdByUserId) === String(user?.id);

              return (
                <div key={order.id} className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-350 rounded-2xl flex items-center justify-between text-xs transition-all hover:shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#00b7e2] text-sm">{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${badge.style}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-400">
                      <span>Customer: <strong className="text-slate-600">{order.customerName}</strong></span>
                      <span className="max-w-xs truncate">Items: <strong className="text-slate-650">
                        {order.lines.map((l: any) => `${getTranslatedName(l.stockItem?.nameJson)} (${l.quantity} units)`).join(", ")}
                      </strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right min-w-[100px]">
                      <span className="block text-sm font-bold text-[#1a2d3c]">{formatMoney(order.totalGross, order.currencyCode)}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Ex VAT: {formatMoney(order.totalNet, order.currencyCode)}</span>
                    </div>

                    <div className="min-w-[130px] text-right">
                      {order.status === 0 ? (
                        isAdminOrAccounts ? (
                          isCreator ? (
                            <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 font-semibold flex items-center justify-end w-fit ml-auto gap-1">
                              <Info className="w-3 h-3" /> Creator Restricted Approval
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApprove(order.id)}
                              disabled={processingId === order.id}
                              className="py-1 px-3 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50 inline-block text-center cursor-pointer active:scale-95"
                            >
                              {processingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                              ) : (
                                <span className="flex items-center gap-1">Approve Order <ArrowRight className="w-3 h-3" /></span>
                              )}
                            </button>
                          )
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] rounded-full uppercase">
                            Awaiting Audit
                          </span>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold text-slate-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Order Processed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raise Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl p-6 bg-white border border-[#e1e5eb] rounded-2xl shadow-2xl space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e1e5eb] pb-3">
              <h3 className="text-base font-bold text-[#1a2d3c]">Draft Sales Order Contract</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Order Number</label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="SO-2026-0001"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800 font-mono"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Exchange Rate (to Base)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-[10px] font-bold text-[#00b7e2] hover:text-[#009dc4] bg-[#00b7e2]/5 hover:bg-[#00b7e2]/10 px-2.5 py-1 border border-[#00b7e2]/30 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                  {lines.map((line, idx) => {
                    const selectedProduct = stockList.find(item => String(item.id) === String(line.stockItemId));
                    
                    // Pricing tiers calculation
                    let contractPrice = 0;
                    let groupPrice = 0;
                    let promoPrice = 0;
                    let basePriceVal = 0;
                    
                    if (selectedProduct) {
                      const ratio = selectedProduct.conversionRatio || 1;
                      const rawBase = selectedProduct.basePrice || 0;
                      const activeBase = line.unitOfSale === "stock" ? rawBase : rawBase / ratio;

                      contractPrice = Number((activeBase * 0.8).toFixed(4));
                      groupPrice = Number((activeBase * 0.9).toFixed(4));
                      promoPrice = Number((activeBase * 0.85).toFixed(4));
                      basePriceVal = Number(activeBase.toFixed(4));
                    }

                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Select Product</label>
                            <select
                              value={line.stockItemId}
                              onChange={(e) => handleLineChange(idx, "stockItemId", e.target.value)}
                              required
                              className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                            >
                              <option value="">Choose Catalog Item</option>
                              {stockList.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.sku} - {getTranslatedName(item.name)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Unit of measure</label>
                            <select
                              value={line.unitOfSale}
                              disabled={!selectedProduct}
                              onChange={(e) => handleLineChange(idx, "unitOfSale", e.target.value)}
                              className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none disabled:opacity-50"
                            >
                              <option value="sell">Selling Unit ({selectedProduct?.sellUnitOfSale || "Each"})</option>
                              <option value="stock">Stocking Unit ({selectedProduct?.stockUnitOfSale || "Pallet"})</option>
                            </select>
                          </div>
                        </div>

                        {selectedProduct && (
                          <div className="flex justify-between items-center text-[10px] text-slate-400 bg-white border border-slate-200/50 p-2 rounded-lg">
                            <span className="font-semibold italic">
                              Ratio: 1 {selectedProduct.stockUnitOfSale || "Pallet"} = {selectedProduct.conversionRatio || 1} {selectedProduct.sellUnitOfSale || "Each"}
                            </span>
                            <span className="text-[9px] text-[#00b7e2] font-semibold">
                              Base: {formatMoney(selectedProduct.basePrice, "GBP")} / {selectedProduct.stockUnitOfSale || "Pallet"}
                            </span>
                          </div>
                        )}

                        {selectedProduct && (
                          <div className="border border-slate-200 bg-white p-2.5 rounded-xl space-y-1.5">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                              Pricing Rules Quick-Apply
                            </span>
                            <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center">
                              <button
                                type="button"
                                onClick={() => handleLineChange(idx, "unitPrice", contractPrice)}
                                className="p-1 border border-slate-100 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer"
                              >
                                <span className="block text-[7px] text-[#00b7e2] font-bold uppercase">Contract</span>
                                <span>{currency}{contractPrice.toFixed(2)}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLineChange(idx, "unitPrice", groupPrice)}
                                className="p-1 border border-slate-100 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer"
                              >
                                <span className="block text-[7px] text-[#00b7e2] font-bold uppercase">Group</span>
                                <span>{currency}{groupPrice.toFixed(2)}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLineChange(idx, "unitPrice", promoPrice)}
                                className="p-1 border border-slate-100 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer"
                              >
                                <span className="block text-[7px] text-[#00b7e2] font-bold uppercase">Promo</span>
                                <span>{currency}{promoPrice.toFixed(2)}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLineChange(idx, "unitPrice", basePriceVal)}
                                className="p-1 border border-slate-100 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer"
                              >
                                <span className="block text-[7px] text-[#00b7e2] font-bold uppercase">Base</span>
                                <span>{currency}{basePriceVal.toFixed(2)}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Quantity</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                              className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Unit Price ({currency})</label>
                            <input
                              type="number"
                              step="0.0001"
                              required
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                              className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none text-right font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                            <select
                              value={line.taxRate}
                              onChange={(e) => handleLineChange(idx, "taxRate", Number(e.target.value))}
                              className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                            >
                              <option value="0.20">20% Standard</option>
                              <option value="0.05">5% Reduced</option>
                              <option value="0.00">0% Zero-Rate</option>
                            </select>
                          </div>
                        </div>

                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Value Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>Estimated Contract Value:</span>
                <span className="text-sm font-bold text-[#00b7e2]">
                  {formatMoney(lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0), currency)}
                </span>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 justify-end pt-3 border-t border-[#e1e5eb]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#ccd3db] text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white text-xs font-semibold rounded disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...
                    </>
                  ) : (
                    "Draft Order Sheet"
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
