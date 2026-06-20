"use client";
 
import React, { useState } from "react";
import axios from "axios";
import { 
  Boxes, 
  ArrowRight, 
  Search, 
  X, 
  Edit2, 
  Globe, 
  RefreshCw, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import GoldenArrow from "@/components/common/GoldenArrow";
 
interface WarehouseQuantity {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  sellingQuantity: number;
  freeStockQuantity: number;
  freeStockSellingQuantity: number;
}
 
interface StockItem {
  id: number;
  sku: string;
  name: string; // JSON string
  description: string; // JSON string
  stockUnitOfSale: string;
  sellUnitOfSale: string;
  conversionRatio: number;
  basePrice: number;
  enableForWebsite: boolean;
  allowBackorder: boolean;
  stockingQuantity: number;
  sellingQuantity: number;
  stockingDemand: number;
  sellingDemand: number;
  stockingFreeStock: number;
  sellingFreeStock: number;
  warehouseQuantities: WarehouseQuantity[];
  purchaseOrders?: any[];
  richDescription?: string | null;
  mediaUrls?: string | null;
  specifications?: string | null;
}
 
interface StockLevelsTabProps {
  stock: StockItem[];
  loading: boolean;
  activeLanguage: string;
  getTranslatedName: (nameJsonStr: string) => string;
  token?: string;
  onSuccess?: () => void;
  isPimActive?: boolean;
}
 
export default function StockLevelsTab({
  stock,
  loading,
  activeLanguage,
  getTranslatedName,
  token,
  onSuccess,
  isPimActive = false,
}: StockLevelsTabProps) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  
  // Edit Form States
  const [editSku, setEditSku] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameFr, setEditNameFr] = useState("");
  const [editDescEn, setEditDescEn] = useState("");
  const [editStockUnit, setEditStockUnit] = useState("");
  const [editSellUnit, setEditSellUnit] = useState("");
  const [editRatio, setEditRatio] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editEnableForWebsite, setEditEnableForWebsite] = useState(true);
  const [editAllowBackorder, setEditAllowBackorder] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const getTranslationValue = (jsonStr: string, lang: string) => {
    try {
      const translations = JSON.parse(jsonStr);
      return translations[lang] || "";
    } catch {
      return jsonStr || "";
    }
  };
 
  const handleSelectStockItem = (item: StockItem) => {
    setSelectedItem(item);
    setEditSku(item.sku || "");
    setEditNameEn(getTranslationValue(item.name, "en-GB"));
    setEditNameFr(getTranslationValue(item.name, "fr-FR"));
    setEditDescEn(getTranslationValue(item.description, "en-GB"));
    setEditStockUnit(item.stockUnitOfSale || "");
    setEditSellUnit(item.sellUnitOfSale || "");
    setEditRatio(item.conversionRatio || 1);
    setEditPrice(item.basePrice || 0);
    setEditEnableForWebsite(item.enableForWebsite !== false);
    setEditAllowBackorder(item.allowBackorder === true);
    setError(null);
  };
 
  const handleUpdateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !token) return;
    setUpdating(true);
    setError(null);
    try {
      const payload = {
        sku: editSku,
        nameJson: JSON.stringify({ "en-GB": editNameEn, "fr-FR": editNameFr }),
        descriptionJson: JSON.stringify({ "en-GB": editDescEn }),
        stockUnitOfSale: editStockUnit,
        sellUnitOfSale: editSellUnit,
        conversionRatio: Number(editRatio),
        basePrice: Number(editPrice),
        enableForWebsite: editEnableForWebsite,
        allowBackorder: editAllowBackorder,
        richDescriptionJson: isPimActive ? JSON.stringify({ "en-GB": `<p>${editDescEn}</p>` }) : "{}",
        mediaUrlsJson: isPimActive ? (selectedItem.mediaUrls || "[]") : "[]",
        specificationsJson: isPimActive ? (selectedItem.specifications || "{}") : "{}"
      };
 
      await axios.post(`http://localhost:5000/api/warehouse/stock/${selectedItem.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
 
      alert("Stock item successfully updated!");
      if (onSuccess) onSuccess();
      setSelectedItem(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update stock item.");
    } finally {
      setUpdating(false);
    }
  };
 
  // 1. Search Filter
  const filteredStock = stock.filter(item => 
    item.sku.toLowerCase().includes(search.toLowerCase()) ||
    getTranslatedName(item.name).toLowerCase().includes(search.toLowerCase())
  );
 
  // 2. Flatten stock items by warehouse. 
  // If an item is in more than one warehouse, show a new line for each warehouse that has quantity > 0.
  const rows: any[] = [];
  filteredStock.forEach(item => {
    const activeWarehouses = item.warehouseQuantities ? item.warehouseQuantities.filter(wq => wq.quantity > 0) : [];
    if (activeWarehouses.length > 1) {
      activeWarehouses.forEach(wh => {
        rows.push({
          ...item,
          warehouseCode: wh.warehouseCode,
          warehouseName: wh.warehouseName,
          displayStockingQty: wh.quantity,
          displaySellingQty: wh.sellingQuantity,
          displayStockingDemand: item.stockingDemand || 0,
          displaySellingDemand: item.sellingDemand || 0,
          displayStockingFreeStock: wh.freeStockQuantity ?? (wh.quantity - (item.stockingDemand || 0)),
          displaySellingFreeStock: wh.freeStockSellingQuantity ?? (wh.sellingQuantity - (item.sellingDemand || 0)),
          isSplit: true
        });
      });
    } else if (activeWarehouses.length === 1) {
      const wh = activeWarehouses[0];
      rows.push({
        ...item,
        warehouseCode: wh.warehouseCode,
        warehouseName: wh.warehouseName,
        displayStockingQty: wh.quantity,
        displaySellingQty: wh.sellingQuantity,
        displayStockingDemand: item.stockingDemand || 0,
        displaySellingDemand: item.sellingDemand || 0,
        displayStockingFreeStock: wh.freeStockQuantity ?? (wh.quantity - (item.stockingDemand || 0)),
        displaySellingFreeStock: wh.freeStockSellingQuantity ?? (wh.sellingQuantity - (item.sellingDemand || 0)),
        isSplit: false
      });
    } else {
      // 0 quantity in all warehouses
      rows.push({
        ...item,
        warehouseCode: "WH-MAIN", // Default warehouse fallback
        warehouseName: "Main Warehouse",
        displayStockingQty: 0,
        displaySellingQty: 0,
        displayStockingDemand: item.stockingDemand || 0,
        displaySellingDemand: item.sellingDemand || 0,
        displayStockingFreeStock: 0 - (item.stockingDemand || 0),
        displaySellingFreeStock: 0 - (item.sellingDemand || 0),
        isSplit: false
      });
    }
  });
 
  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-violet-600" />
          Stock Item Inventory Levels
        </h3>
 
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or Name..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 shadow-sm"
          />
        </div>
      </div>
 
      {loading ? (
        <div className="text-slate-500 text-xs text-center py-10 animate-pulse">Loading inventory levels...</div>
      ) : rows.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-10">No matching inventory records found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/75">
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-center">Warehouse</th>
                <th className="py-3.5 px-4 text-center">Unit Ratio</th>
                <th className="py-3.5 px-4 text-right">Stock</th>
                <th className="py-3.5 px-4 text-right">Demand</th>
                <th className="py-3.5 px-4 text-right">Free Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {rows.map((row, idx) => (
                <tr 
                  key={`${row.id}-${row.warehouseCode}-${idx}`} 
                  onClick={() => handleSelectStockItem(row)}
                  className="hover:bg-slate-50/65 text-slate-700 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-violet-650">
                    <div className="flex items-center gap-1.5">
                      <span>{row.sku}</span>
                      <GoldenArrow type="item" id={row.sku} />
                    </div>
                    <div className="mt-1">
                      {row.allowBackorder ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">BO Allowed</span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 text-slate-500 border border-slate-200">No BO</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{getTranslatedName(row.name)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${row.isSplit ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                      {row.warehouseCode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 text-[10px]">
                      1 {row.stockUnitOfSale}
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      {row.conversionRatio} {row.sellUnitOfSale}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-semibold text-slate-800">
                      {row.displayStockingQty} <span className="text-[10px] text-slate-400 font-normal">{row.stockUnitOfSale}</span>
                    </div>
                    <div className="text-[10px] text-slate-450 font-normal mt-0.5">
                      {row.displaySellingQty} {row.sellUnitOfSale}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-semibold text-slate-700">
                      {row.displayStockingDemand} <span className="text-[10px] text-slate-400 font-normal">{row.stockUnitOfSale}</span>
                    </div>
                    <div className="text-[10px] text-slate-450 font-normal mt-0.5">
                      {row.displaySellingDemand} {row.sellUnitOfSale}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className={`font-bold ${row.displayStockingFreeStock < 0 ? "text-rose-600" : "text-emerald-650"}`}>
                      {row.displayStockingFreeStock} <span className="text-[10px] text-slate-450 font-normal">{row.stockUnitOfSale}</span>
                    </div>
                    <div className="text-[10px] text-slate-450 font-normal mt-0.5">
                      {row.displaySellingFreeStock} {row.sellUnitOfSale}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* View / Edit Slide-over Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest block font-mono">Stock Card Details</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Boxes className="w-5 h-5 text-violet-650" /> {getTranslatedName(selectedItem.name)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
 
            {/* Form */}
            <form onSubmit={handleUpdateStockItem} className="space-y-4 flex-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Edit2 className="w-3.5 h-3.5 text-violet-655" /> Edit Specifications
              </h4>
 
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Base Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>
 
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">English Name</label>
                <input
                  type="text"
                  required
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>
 
              {isPimActive && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-550 text-emerald-600 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> French Translation Name (PIM Active)
                  </label>
                  <input
                    type="text"
                    value={editNameFr}
                    onChange={(e) => setEditNameFr(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-emerald-250 focus:outline-none focus:border-emerald-500 text-slate-800 rounded-lg"
                  />
                </div>
              )}
 
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <textarea
                  value={editDescEn}
                  onChange={(e) => setEditDescEn(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  rows={3}
                />
              </div>
 
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Stock Unit</label>
                  <input
                    type="text"
                    required
                    value={editStockUnit}
                    onChange={(e) => setEditStockUnit(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Selling Unit</label>
                  <input
                    type="text"
                    required
                    value={editSellUnit}
                    onChange={(e) => setEditSellUnit(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRatio}
                    onChange={(e) => setEditRatio(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>
 
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={editEnableForWebsite}
                    onChange={(e) => setEditEnableForWebsite(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-650 focus:ring-violet-500 border-slate-350"
                  />
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-550">Enable for B2B E-Commerce Website</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={editAllowBackorder}
                    onChange={(e) => setEditAllowBackorder(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-650 focus:ring-violet-500 border-slate-350"
                  />
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-550">Allow Backorders (Negative Free Stock)</span>
                </label>
              </div>
 
              {/* Warehouse Inventory Allocations and POs (Drawer list sections) */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">Location Allocations</h5>
                  <div className="space-y-1.5">
                    {selectedItem.warehouseQuantities && selectedItem.warehouseQuantities.map((wh) => (
                      <div key={wh.warehouseId} className="flex justify-between items-center text-xs py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-150">
                        <span className="font-semibold text-slate-800">{wh.warehouseName} ({wh.warehouseCode})</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{wh.quantity}</span> <span className="text-[10px] text-slate-400">{selectedItem.stockUnitOfSale}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">Pending Purchase Orders</h5>
                  {selectedItem.purchaseOrders && selectedItem.purchaseOrders.length > 0 ? (
                    <div className="border border-slate-150 rounded-xl overflow-hidden bg-white max-h-[160px] overflow-y-auto">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[8px]">
                            <th className="py-1.5 px-2">PO Ref</th>
                            <th className="py-1.5 px-2">Supplier</th>
                            <th className="py-1.5 px-2 text-center">Expected</th>
                            <th className="py-1.5 px-2 text-right">Qty (Ord/Rec)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedItem.purchaseOrders.map((po: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-2 font-mono font-bold text-emerald-650">{po.orderNumber}</td>
                              <td className="py-1.5 px-2 font-medium truncate max-w-[80px]" title={po.supplierName}>{po.supplierName}</td>
                              <td className="py-1.5 px-2 text-center text-slate-550">
                                {po.expectedDeliveryDate 
                                  ? new Date(po.expectedDeliveryDate).toLocaleDateString(activeLanguage, { dateStyle: "short" }) 
                                  : "N/A"}
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold">
                                {po.quantity} / {po.receivedQuantity || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-450 text-[10px] italic bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-center">
                      No pending purchase orders.
                    </div>
                  )}
                </div>
              </div>
 
              {/* Submit Section */}
              <div className="flex gap-3 justify-end pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Save SKU Specifications
                    </>
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
