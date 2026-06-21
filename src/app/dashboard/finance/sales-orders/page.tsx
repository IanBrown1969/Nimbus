"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import SearchableCustomerDropdown from "@/components/common/SearchableCustomerDropdown";
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
  Sparkles,
  Globe
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [exchangeRate, setExchangeRate] = useState(1.0);

  // Delivery Address states
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState<string>("");
  const [addNewAddress, setAddNewAddress] = useState(false);
  const [newAddressName, setNewAddressName] = useState("");
  const [newAddressLine1, setNewAddressLine1] = useState("");
  const [newAddressLine2, setNewAddressLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newStateVal, setNewStateVal] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("GB");

  const defaultTaxOptions = [
    { rate: 0.00, className: "0% Zero-Rate" }
  ];
  const [taxOptions, setTaxOptions] = useState<any[]>(defaultTaxOptions);

  // Multi-line items state
  const [lines, setLines] = useState<SalesLine[]>([
    { stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.00 }
  ]);
  
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  useEffect(() => {
    if (!customerName || !showModal) {
      setTaxOptions(defaultTaxOptions);
      return;
    }

    if (showModal && customerName && token) {
      const resolveAll = async () => {
        try {
          const updatedLines = await Promise.all(
            lines.map(async (line) => {
              if (!line.stockItemId) return line;
              let url = `http://localhost:5000/api/finance/tax/resolve?customerName=${encodeURIComponent(customerName)}&stockItemId=${line.stockItemId}`;
              if (addNewAddress) {
                url += `&deliveryCountryCode=${newCountryCode}`;
              } else if (selectedDeliveryAddressId) {
                url += `&deliveryAddressId=${selectedDeliveryAddressId}`;
              }
              const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
              });
              return { ...line, taxRate: res.data.rate };
            })
          );
          
          setLines(prev => {
            const hasChanged = updatedLines.some((l, idx) => l.taxRate !== prev[idx]?.taxRate);
            return hasChanged ? updatedLines : prev;
          });

          let optUrl = `http://localhost:5000/api/finance/tax/options?customerName=${encodeURIComponent(customerName)}`;
          if (addNewAddress) {
            optUrl += `&deliveryCountryCode=${newCountryCode}`;
          } else if (selectedDeliveryAddressId) {
            optUrl += `&deliveryAddressId=${selectedDeliveryAddressId}`;
          }
          const optRes = await axios.get(optUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const newOptions = optRes.data || [];
          setTaxOptions(newOptions);

          // Update lines whose taxRate is not in the new options list
          setLines(prev => {
            const updated = prev.map(line => {
              if (newOptions.length > 0) {
                const isInOptions = newOptions.some((opt: any) => Math.abs(opt.rate - line.taxRate) < 0.001);
                if (!isInOptions) {
                  return { ...line, taxRate: newOptions[0].rate };
                }
              } else {
                return { ...line, taxRate: 0.00 };
              }
              return line;
            });
            const hasChanged = updated.some((l, idx) => l.taxRate !== prev[idx]?.taxRate);
            return hasChanged ? updated : prev;
          });
        } catch (err) {
          console.error("Error resolving all line tax rates", err);
        }
      };
      
      resolveAll();
    }
  }, [customerName, selectedDeliveryAddressId, addNewAddress, newCountryCode, showModal, token]);

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

      const customersRes = await axios.get("http://localhost:5000/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(customersRes.data);

      const countriesRes = await axios.get("http://localhost:5000/api/countries", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCountries(countriesRes.data);

      const warehousesRes = await axios.get("http://localhost:5000/api/warehouse/warehouses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouses(warehousesRes.data);

      // Refresh selected order details if open
      setSelectedOrder((prev: any) => {
        if (!prev) return null;
        const updated = ordersRes.data.find((o: any) => o.id === prev.id);
        return updated || prev;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load sales orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.00 }]);
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

        if (field === "stockItemId" && customerName && token) {
          let url = `http://localhost:5000/api/finance/tax/resolve?customerName=${encodeURIComponent(customerName)}&stockItemId=${value}`;
          if (addNewAddress) {
            url += `&deliveryCountryCode=${newCountryCode}`;
          } else if (selectedDeliveryAddressId) {
            url += `&deliveryAddressId=${selectedDeliveryAddressId}`;
          }
          
          axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => {
            setLines(prev => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index].taxRate = res.data.rate;
              }
              return updated;
            });
          }).catch(err => {
            console.error("Failed to resolve tax rate", err);
          });
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
        const unitName = line.unitOfSale === "stock" 
          ? (prod?.stockUnitOfSale || "Pallet") 
          : (prod?.sellUnitOfSale || "Each");

        return {
          stockItemId: Number(line.stockItemId),
          quantity: qtyToSend,
          unitPrice: priceToSend,
          taxRate: Number(line.taxRate),
          unitOfSale: unitName
        };
      });

      const payload = {
        orderNumber,
        customerName,
        currencyCode: currency,
        exchangeRateToBase: Number(exchangeRate),
        deliveryAddressId: addNewAddress ? null : (selectedDeliveryAddressId ? Number(selectedDeliveryAddressId) : null),
        newDeliveryAddress: addNewAddress ? {
          addressName: newAddressName,
          addressLine1: newAddressLine1,
          addressLine2: newAddressLine2 || null,
          city: newCity,
          state: newStateVal || null,
          postalCode: newPostalCode,
          countryCode: newCountryCode
        } : null,
        lines: payloadLines
      };

      await axios.post("http://localhost:5000/api/finance/sales-orders", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setCustomerName("");
      setOrderNumber("");
      setSelectedDeliveryAddressId("");
      setAddNewAddress(false);
      setNewAddressName("");
      setNewAddressLine1("");
      setNewAddressLine2("");
      setNewCity("");
      setNewStateVal("");
      setNewPostalCode("");
      setNewCountryCode("GB");
      setLines([{ stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.00 }]);
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
            setLines([{ stockItemId: "", unitOfSale: "sell", quantity: 10, unitPrice: 15.0, taxRate: 0.00 }]);
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
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="p-4 bg-white border border-[#e1e5eb] hover:border-slate-350 hover:bg-slate-50/40 cursor-pointer rounded-2xl flex items-center justify-between text-xs transition-all hover:shadow-sm"
                >
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
                        {order.lines.map((l: any) => `${getTranslatedName(l.stockItem?.nameJson)} (${l.quantity} ${l.unitOfSale || "units"})`).join(", ")}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(order.id);
                              }}
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
                  <SearchableCustomerDropdown
                    customers={customers}
                    value={customerName}
                    onChange={(name, customer) => {
                      setCustomerName(name);
                      if (customer) {
                        setCurrency(customer.defaultCurrencyCode);
                        setExchangeRate(customer.defaultCurrencyCode === "GBP" ? 1.0 : (customer.defaultCurrencyCode === "USD" ? 1.25 : 1.15));
                      }
                    }}
                    placeholder="John Builders Ltd"
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

              {/* Delivery Address Section */}
              {customerName && (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Delivery Address</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddNewAddress(!addNewAddress);
                        setNewAddressName("");
                        setNewAddressLine1("");
                        setNewAddressLine2("");
                        setNewCity("");
                        setNewStateVal("");
                        setNewPostalCode("");
                        setNewCountryCode("GB");
                      }}
                      className="text-[10px] font-bold text-[#00b7e2] hover:text-[#009dc4] bg-[#00b7e2]/5 hover:bg-[#00b7e2]/10 px-2 py-0.5 border border-[#00b7e2]/20 rounded cursor-pointer animate-pulse-subtle"
                    >
                      {addNewAddress ? "Select Existing Address" : "Add New Shipping Address"}
                    </button>
                  </div>

                  {!addNewAddress ? (
                    <div>
                      <select
                        value={selectedDeliveryAddressId}
                        onChange={(e) => setSelectedDeliveryAddressId(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800"
                      >
                        <option value="">No delivery address (Use Billing Address for domestic calculation)</option>
                        {(() => {
                          const selectedCustomer = customers.find(c => c.name === customerName || c.companyName === customerName);
                          const shippingAddresses = selectedCustomer ? (selectedCustomer.addresses || []).filter((addr: any) => addr.addressType === "Shipping") : [];
                          return shippingAddresses.map((addr: any) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.addressName} - {addr.addressLine1}, {addr.city}, {addr.country?.name || addr.countryId}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Address Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Warehouse 1, Berlin Office"
                            value={newAddressName}
                            onChange={(e) => setNewAddressName(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 1</label>
                          <input
                            type="text"
                            required
                            placeholder="Street name, building number"
                            value={newAddressLine1}
                            onChange={(e) => setNewAddressLine1(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 2 (Optional)</label>
                          <input
                            type="text"
                            placeholder="Apartment, suite, unit, etc."
                            value={newAddressLine2}
                            onChange={(e) => setNewAddressLine2(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">City</label>
                          <input
                            type="text"
                            required
                            placeholder="City"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">State / Region (Optional)</label>
                          <input
                            type="text"
                            placeholder="State"
                            value={newStateVal}
                            onChange={(e) => setNewStateVal(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Postal Code</label>
                          <input
                            type="text"
                            required
                            placeholder="Postcode"
                            value={newPostalCode}
                            onChange={(e) => setNewPostalCode(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-500">Country</label>
                          <select
                            value={newCountryCode}
                            onChange={(e) => setNewCountryCode(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none"
                          >
                            {countries.map((c) => (
                              <option key={c.id} value={c.code}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                            {selectedProduct && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                                {(() => {
                                  const selectedCustomer = customers.find(c => c.name === customerName || c.companyName === customerName);
                                  const servedFromCountryId = selectedCustomer?.servedFromCountryId;
                                  const countryWarehouses = servedFromCountryId 
                                    ? warehouses.filter((w: any) => w.countryId === servedFromCountryId) 
                                    : [];
                                  const filterByCountry = servedFromCountryId && countryWarehouses.length > 0;
                                  
                                  if (filterByCountry) {
                                    const warehouseIds = countryWarehouses.map((w: any) => w.id);
                                    const relevantWhQuantities = (selectedProduct.warehouseQuantities || []).filter((wq: any) => warehouseIds.includes(wq.warehouseId));
                                    const sellingSum = relevantWhQuantities.reduce((sum: number, wq: any) => sum + (wq.sellingQuantity || 0), 0);
                                    const countryName = countryWarehouses[0]?.country?.name || `Country ID: ${servedFromCountryId}`;
                                    const isOutOfStock = sellingSum <= 0;
                                    
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] ${
                                        isOutOfStock 
                                          ? "bg-rose-50 border-rose-250 text-rose-700" 
                                          : "bg-emerald-50 border-emerald-250 text-emerald-700"
                                      }`}>
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>
                                          Stock Available in <strong>{countryName}</strong>: {sellingSum} {selectedProduct.sellUnitOfSale || "Each"}
                                        </span>
                                      </span>
                                    );
                                  } else {
                                    const sellingSum = selectedProduct.sellingQuantity || 0;
                                    const isOutOfStock = sellingSum <= 0;
                                    
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] ${
                                        isOutOfStock 
                                          ? "bg-rose-50 border-rose-250 text-rose-700" 
                                          : "bg-emerald-50 border-emerald-250 text-emerald-700"
                                      }`}>
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>
                                          Stock Available (All Warehouses): {sellingSum} {selectedProduct.sellingQuantity || 0} {selectedProduct.sellUnitOfSale || "Each"}
                                        </span>
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                            )}
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
                              {taxOptions.map((opt) => (
                                <option key={opt.rate} value={opt.rate}>
                                  {opt.className}
                                </option>
                              ))}
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

      {/* Sales Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#00b7e2] uppercase tracking-widest block font-mono">Sales Order Details</span>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-900 font-mono">{selectedOrder.orderNumber}</h3>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusBadge(selectedOrder.status).style}`}>
                    {getStatusBadge(selectedOrder.status).text}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-805 rounded-xl cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 py-5 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Header info */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Order Specifications</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Customer:</span>
                      <span className="font-bold text-slate-800">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Order Date:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(selectedOrder.orderDate).toLocaleString(activeLanguage, {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Currency Code:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedOrder.currencyCode}</span>
                    </div>
                    <div className="flex justify-between pb-0.5">
                      <span className="text-slate-400">Exchange Rate:</span>
                      <span className="font-mono text-slate-700">{selectedOrder.exchangeRateToBase.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Card */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Shipping Address</h4>
                  {selectedOrder.deliveryAddress ? (
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-800">{selectedOrder.deliveryAddress.addressName}</div>
                      <div className="text-slate-600">{selectedOrder.deliveryAddress.addressLine1}</div>
                      {selectedOrder.deliveryAddress.addressLine2 && (
                        <div className="text-slate-600">{selectedOrder.deliveryAddress.addressLine2}</div>
                      )}
                      <div className="text-slate-600">
                        {selectedOrder.deliveryAddress.city}
                        {selectedOrder.deliveryAddress.state ? `, ${selectedOrder.deliveryAddress.state}` : ""}
                        {` ${selectedOrder.deliveryAddress.postalCode}`}
                      </div>
                      <div className="font-bold text-slate-750 flex items-center gap-1 mt-1 font-sans">
                        <Globe className="w-3.5 h-3.5 text-slate-450" />
                        <span>{selectedOrder.deliveryAddress.country?.name || selectedOrder.deliveryAddress.countryId}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs italic text-slate-400 flex items-center justify-center h-full pb-4">
                      Billing Address (Domestic / No Shipping address set)
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ordered Products & Line Items</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">VAT Rate</th>
                        <th className="py-2.5 px-3 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {(selectedOrder.lines || []).map((line: any, index: number) => {
                        const netAmount = (line.quantity || 0) * (line.unitPrice || 0);
                        const taxAmount = netAmount * (line.taxRate || 0);
                        const grossAmount = netAmount + taxAmount;
                        return (
                          <tr key={line.id || index} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">{line.stockItem?.sku}</td>
                            <td className="py-3 px-3 text-slate-900">{getTranslatedName(line.stockItem?.nameJson)}</td>
                            <td className="py-3 px-3 text-right font-bold">{line.quantity}</td>
                            <td className="py-3 px-3 text-slate-505 font-normal">{line.unitOfSale}</td>
                            <td className="py-3 px-3 text-right font-mono">{formatMoney(line.unitPrice, selectedOrder.currencyCode)}</td>
                            <td className="py-3 px-3 text-right text-slate-500">{(line.taxRate * 100).toFixed(0)}%</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-800 font-mono">
                              {formatMoney(grossAmount, selectedOrder.currencyCode)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Totals Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-800">
                <div className="flex gap-4">
                  <div className="text-slate-500">
                    Net Subtotal: <strong className="text-slate-800 font-mono">{formatMoney(selectedOrder.totalNet, selectedOrder.currencyCode)}</strong>
                  </div>
                  <div className="text-slate-500 border-l border-slate-200 pl-4">
                    VAT Total: <strong className="text-slate-800 font-mono">{formatMoney(selectedOrder.totalTax, selectedOrder.currencyCode)}</strong>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#00b7e2] flex items-center gap-1.5">
                  <span>Grand Total Gross:</span>
                  <span className="font-mono text-base">{formatMoney(selectedOrder.totalGross, selectedOrder.currencyCode)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Quick Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer bg-white"
              >
                Close View
              </button>
              
              {selectedOrder.status === 0 && (
                (() => {
                  const isAdminOrAccounts = user?.role === "CompanyAdmin" || user?.role === "Accounts" || user?.role === "GlobalAdmin";
                  const isCreator = String(selectedOrder.createdByUserId) === String(user?.id);
                  
                  if (isAdminOrAccounts) {
                    if (isCreator) {
                      return (
                        <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-semibold flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> Creator Restricted Approval
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(selectedOrder.id);
                        }}
                        disabled={processingId === selectedOrder.id}
                        className="px-4 py-2 bg-[#00b7e2] hover:bg-[#009dc4] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm shadow-[#00b7e2]/10"
                      >
                        {processingId === selectedOrder.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Approve Order</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    );
                  }
                  
                  return (
                    <span className="px-3 py-2 text-[10px] font-bold bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] rounded-lg uppercase">
                      Awaiting Audit
                    </span>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
