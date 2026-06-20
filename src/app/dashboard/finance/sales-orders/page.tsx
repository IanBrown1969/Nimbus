"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Receipt, Plus, CheckCircle, XCircle, ArrowRight, Loader2, FileText, ChevronDown } from "lucide-react";

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

  // Line item states
  const [selectedStockId, setSelectedStockId] = useState("");
  const [unitOfSale, setUnitOfSale] = useState<"stock" | "sell">("sell");
  const [lineQty, setLineQty] = useState(10);
  const [linePrice, setLinePrice] = useState(15.0);
  const [vatRate, setVatRate] = useState(0.20);
  
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  useEffect(() => {
    const prod = stockList.find(item => String(item.id) === String(selectedStockId));
    if (prod) {
      if (unitOfSale === "stock") {
        setLinePrice(prod.basePrice || 0);
      } else {
        const ratio = prod.conversionRatio || 1;
        setLinePrice(Number(((prod.basePrice || 0) / ratio).toFixed(4)));
      }
    }
  }, [selectedStockId, unitOfSale, stockList]);

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
      if (stockRes.data.length > 0) {
        setSelectedStockId(stockRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load sales orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const prod = stockList.find(item => String(item.id) === String(selectedStockId));
      const ratio = prod ? (prod.conversionRatio || 1) : 1;
 
      const qtyToSend = unitOfSale === "stock" ? Number(lineQty) * ratio : Number(lineQty);
      const priceToSend = unitOfSale === "stock" ? Number(linePrice) / ratio : Number(linePrice);
 
      const payload = {
        orderNumber,
        customerName,
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        lines: [
          {
            stockItemId: selectedStockId,
            quantity: qtyToSend,
            unitPrice: priceToSend,
            taxRate: Number(vatRate)
          }
        ]
      };

      await axios.post("http://localhost:5000/api/finance/sales-orders", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setCustomerName("");
      setOrderNumber("");
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
          <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest">Sales</span>
          <h2 className="text-2xl font-bold text-[#1a2d3c] mt-0.5">Sales Orders</h2>
          <p className="text-slate-500 text-xs mt-1">Record contracts, approve them to trigger warehouse picking, and dispatch shipments to customers.</p>
        </div>
        <button
          onClick={() => {
            setOrderNumber(`SO-2026-000${orders.length + 1}`);
            setShowModal(true);
          }}
          className="py-2 px-4 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white shadow-sm font-semibold flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Raise Sales Order
        </button>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Orders List Card */}
      <div className="p-6 rounded border border-[#e1e5eb] bg-white shadow-sm space-y-4">
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

              return (
                <div key={order.id} className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-300 rounded flex items-center justify-between text-xs transition-all hover:shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#00b7e2] text-sm">{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${badge.style}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-400">
                      <span>Customer: <strong className="text-slate-600">{order.customerName}</strong></span>
                      <span>Item: <strong className="text-slate-600">{getTranslatedName(order.lines[0]?.stockItem?.nameJson)} ({order.lines[0]?.quantity} units)</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right min-w-[100px]">
                      <span className="block text-sm font-bold text-[#1a2d3c]">{formatMoney(order.totalGross, order.currencyCode)}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Ex VAT: {formatMoney(order.totalNet, order.currencyCode)}</span>
                    </div>

                    <div className="min-w-[120px] text-right">
                      {order.status === 0 ? ( // Draft
                        isAdminOrAccounts ? (
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={processingId === order.id}
                            className="py-1 px-3 rounded bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50 inline-block text-center"
                          >
                            {processingId === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                            ) : (
                              <span className="flex items-center gap-1">Approve Order <ArrowRight className="w-3 h-3" /></span>
                            )}
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md p-6 bg-white border border-[#e1e5eb] rounded shadow-2xl space-y-5 text-slate-800">
            <h3 className="text-base font-bold text-[#1a2d3c] border-b border-[#e1e5eb] pb-3">Draft Sales Order Contract</h3>
            
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-800"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-800"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-800"
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
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2] text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-[#ccd3db] rounded space-y-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Order Line Details</span>
                
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Select Product</label>
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded text-slate-800 focus:outline-none focus:border-[#00b7e2]"
                  >
                    {stockList.map((item) => (
                      <option key={item.id} value={item.id}>{item.sku} - {getTranslatedName(item.name)}</option>
                    ))}
                  </select>
                </div>
 
                {(() => {
                  const selectedProduct = stockList.find(item => String(item.id) === String(selectedStockId));
                  if (!selectedProduct) return null;
 
                  const ratio = selectedProduct.conversionRatio || 1;
                  const rawBase = selectedProduct.basePrice || 0;
                  const activeBase = unitOfSale === "stock" ? rawBase : rawBase / ratio;
 
                  const contractPrice = Number((activeBase * 0.8).toFixed(4));
                  const groupPrice = Number((activeBase * 0.9).toFixed(4));
                  const promoPrice = Number((activeBase * 0.85).toFixed(4));
                  const basePriceVal = Number(activeBase.toFixed(4));
 
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-800">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Unit of Sale</label>
                          <select
                            value={unitOfSale}
                            onChange={(e) => setUnitOfSale(e.target.value as any)}
                            className="w-full mt-1 text-xs px-3 py-2 bg-white border border-[#ccd3db] rounded focus:outline-none focus:border-[#00b7e2]"
                          >
                            <option value="sell">Selling Unit ({selectedProduct.sellUnitOfSale || "Each"})</option>
                            <option value="stock">Stocking Unit ({selectedProduct.stockUnitOfSale || "Pallet"})</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-2">
                          <span className="text-[10px] text-slate-500 font-semibold italic">
                            1 {selectedProduct.stockUnitOfSale} = {selectedProduct.conversionRatio} {selectedProduct.sellUnitOfSale}
                          </span>
                        </div>
                      </div>
 
                      {/* Complex Pricing Breakdown Widget */}
                      <div className="border border-[#ccd3db] bg-white p-3 rounded space-y-2">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Pricing Tiers (Click to Apply)
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setLinePrice(contractPrice)}
                            className="p-1.5 text-left border border-slate-200 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-[#00b7e2] font-bold">Contract Pricing</span>
                            <span>£{contractPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(groupPrice)}
                            className="p-1.5 text-left border border-slate-200 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-[#00b7e2] font-bold">Group Pricing</span>
                            <span>£{groupPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(promoPrice)}
                            className="p-1.5 text-left border border-slate-200 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-[#00b7e2] font-bold">Promotional Pricing</span>
                            <span>£{promoPrice.toFixed(2)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinePrice(basePriceVal)}
                            className="p-1.5 text-left border border-slate-200 rounded hover:border-[#00b7e2] hover:bg-[#00b7e2]/5 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="block text-[8px] uppercase text-[#00b7e2] font-bold">All Customer Pricing</span>
                            <span>£{basePriceVal.toFixed(2)}</span>
                          </button>
                        </div>
                      </div>
 
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">
                            Qty ({unitOfSale === "stock" ? selectedProduct.stockUnitOfSale : selectedProduct.sellUnitOfSale})
                          </label>
                          <input
                            type="number"
                            required
                            value={lineQty}
                            onChange={(e) => setLineQty(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded text-slate-800 focus:outline-none focus:border-[#00b7e2]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">
                            Price (per {unitOfSale === "stock" ? selectedProduct.stockUnitOfSale : selectedProduct.sellUnitOfSale})
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            required
                            value={linePrice}
                            onChange={(e) => setLinePrice(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded text-slate-800 focus:outline-none focus:border-[#00b7e2]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">VAT Rate</label>
                          <select
                            value={vatRate}
                            onChange={(e) => setVatRate(Number(e.target.value))}
                            className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-[#ccd3db] rounded text-slate-800 focus:outline-none focus:border-[#00b7e2]"
                          >
                            <option value="0.20">20% Standard</option>
                            <option value="0.05">5% Reduced</option>
                            <option value="0.00">0% Zero-Rate</option>
                          </select>
                        </div>
                      </div>
                    </>
                  );
                })()}
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
                  Draft Order Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
