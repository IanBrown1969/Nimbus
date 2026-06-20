"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useApp } from "@/context/AppContext";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import GoldenArrow from "@/components/common/GoldenArrow";
import { 
  Boxes, 
  MapPin, 
  ClipboardCheck, 
  Lock, 
  Plus, 
  Calculator,
  ArrowRight,
  Truck,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle
} from "lucide-react";

function WarehousePageContent() {
  const { token, plugins, user, activeLanguage } = useApp();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"stock" | "bins" | "audits" | "picks" | "goodsin" | "shipments" | "adjustments">("stock");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["stock", "bins", "audits", "picks", "goodsin", "shipments", "adjustments"].includes(tabParam)) {
      setTab(tabParam as any);
    }
  }, [searchParams]);

  // Dynamic lists
  const [stock, setStock] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [pickLists, setPickLists] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [sku, setSku] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [stockUnit, setStockUnit] = useState("Pallet");
  const [sellUnit, setSellUnit] = useState("Each");
  const [ratio, setRatio] = useState(100.0);
  const [price, setPrice] = useState(150.0);
  const [submittingStock, setSubmittingStock] = useState(false);

  // WMS audit notes
  const [auditNotes, setAuditNotes] = useState("");

  // WMS Bin states
  const [showBinModal, setShowBinModal] = useState(false);
  const [binCode, setBinCode] = useState("");
  const [binDesc, setBinDesc] = useState("");
  const [submittingBin, setSubmittingBin] = useState(false);

  // Adjustments states
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjStockId, setAdjStockId] = useState("");
  const [adjBinId, setAdjBinId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [adjQty, setAdjQty] = useState(10.0);
  const [adjReason, setAdjReason] = useState("");
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // Goods In (Deliveries) states
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [delPOId, setDelPOId] = useState("");
  const [delNumber, setDelNumber] = useState("");
  const [delQty, setDelQty] = useState(10.0);
  const [delBinId, setDelBinId] = useState("");
  const [submittingDel, setSubmittingDel] = useState(false);

  // Shipment states
  const [showShipModal, setShowShipModal] = useState(false);
  const [shipSOId, setShipSOId] = useState("");
  const [shipNumber, setShipNumber] = useState("");
  const [shipCarrier, setShipCarrier] = useState("DHL");
  const [shipTracking, setShipTracking] = useState("");
  const [submittingShip, setSubmittingShip] = useState(false);

  // Complete Pick states
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState<any>(null);
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [submittingPick, setSubmittingPick] = useState(false);

  const isPimActive = plugins.find(p => p.code === "PIM")?.isSubscribed;
  const isWmsActive = plugins.find(p => p.code === "WMS")?.isSubscribed;

  useEffect(() => {
    if (token) {
      fetchWarehouseData();
      axios.get("http://localhost:5000/api/warehouse/warehouses", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setWarehouses(res.data);
        if (res.data.length > 0) {
          setSelectedWarehouseId(res.data[0].id.toString());
        }
      }).catch(err => {
        console.error("Failed to fetch warehouses", err);
      });
    }
  }, [token, plugins, tab]);

  const fetchWarehouseData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "stock") {
        const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStock(stockRes.data);
      } else if (tab === "bins" && isWmsActive) {
        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
      } else if (tab === "picks" && isWmsActive) {
        const pickRes = await axios.get("http://localhost:5000/api/warehouse/pick-lists", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPickLists(pickRes.data);

        // Fetch bins for reallocation
        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
      } else if (tab === "goodsin" && isWmsActive) {
        const delRes = await axios.get("http://localhost:5000/api/warehouse/deliveries", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDeliveries(delRes.data);

        const poRes = await axios.get("http://localhost:5000/api/finance/purchase-orders", {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Only show ordered POs that can be delivered
        setPurchaseOrders(poRes.data.filter((p: any) => p.status === "Ordered" || p.status === 1 || p.status === 2));

        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);

        const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStock(stockRes.data);
      } else if (tab === "shipments" && isWmsActive) {
        const shipRes = await axios.get("http://localhost:5000/api/warehouse/shipments", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setShipments(shipRes.data);

        // Fetch sales orders that are Approved and ready to ship
        const soRes = await axios.get("http://localhost:5000/api/finance/sales-orders", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSalesOrders(soRes.data.filter((s: any) => s.status === 1 || s.status === "Approved"));

        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
      } else if (tab === "adjustments" && isWmsActive) {
        const adjRes = await axios.get("http://localhost:5000/api/warehouse/adjustments", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAdjustments(adjRes.data);

        const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStock(stockRes.data);
        if (stockRes.data.length > 0) {
          setAdjStockId(stockRes.data[0].id);
        }

        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
        if (binsRes.data.length > 0) {
          setAdjBinId(binsRes.data[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load warehouse operations.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStock(true);
    setError(null);
    try {
      const payload = {
        sku,
        nameJson: JSON.stringify({ "en-GB": nameEn, "fr-FR": nameFr }),
        descriptionJson: JSON.stringify({ "en-GB": descEn }),
        stockUnitOfSale: stockUnit,
        sellUnitOfSale: sellUnit,
        conversionRatio: Number(ratio),
        basePrice: Number(price),
        enableForWebsite: true,
        richDescriptionJson: isPimActive ? JSON.stringify({ "en-GB": `<p>${descEn}</p>` }) : "{}",
        mediaUrlsJson: isPimActive ? "[\"https://images.unsplash.com/photo-1590069261209-f8e9b8642343\"]" : "[]",
        specificationsJson: isPimActive ? JSON.stringify({ "weight": "2kg" }) : "{}"
      };

      await axios.post("http://localhost:5000/api/warehouse/stock", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddStockModal(false);
      setSku("");
      setNameEn("");
      setNameFr("");
      setDescEn("");
      setRatio(100);
      setPrice(150);
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create stock item.");
    } finally {
      setSubmittingStock(false);
    }
  };

  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBin(true);
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/warehouse/bins", {
        code: binCode,
        description: binDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowBinModal(false);
      setBinCode("");
      setBinDesc("");
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create bin location.");
    } finally {
      setSubmittingBin(false);
    }
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdj(true);
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/warehouse/adjustments", {
        stockItemId: adjStockId,
        binLocationId: adjBinId === "" ? null : adjBinId,
        warehouseId: selectedWarehouseId === "" ? 0 : Number(selectedWarehouseId),
        quantityChanged: Number(adjQty),
        reason: adjReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAdjModal(false);
      setAdjQty(10);
      setAdjReason("");
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post adjustment.");
    } finally {
      setSubmittingAdj(false);
    }
  };

  const handleReceiveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDel(true);
    setError(null);
    try {
      const po = purchaseOrders.find(p => p.id === delPOId);
      if (!po) return;

      const payload = {
        purchaseOrderId: delPOId,
        deliveryNumber: delNumber,
        lines: po.lines.map((line: any) => ({
          stockItemId: line.stockItemId,
          quantityDelivered: Number(delQty), // simplfied receipt of first PO line item
          binLocationId: delBinId === "" ? null : delBinId,
          warehouseId: selectedWarehouseId === "" ? null : Number(selectedWarehouseId)
        }))
      };

      await axios.post("http://localhost:5000/api/warehouse/deliveries", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeliveryModal(false);
      setDelNumber("");
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to register delivery.");
    } finally {
      setSubmittingDel(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingShip(true);
    setError(null);
    try {
      const so = salesOrders.find(s => s.id === shipSOId);
      if (!so) return;

      const payload = {
        salesOrderId: shipSOId,
        shipmentNumber: shipNumber,
        carrier: shipCarrier,
        trackingNumber: shipTracking,
        lines: so.lines.map((line: any) => ({
          stockItemId: line.stockItemId,
          quantityShipped: line.quantity,
          binLocationId: delBinId === "" ? null : delBinId // reuses chosen bin location
        }))
      };

      await axios.post("http://localhost:5000/api/warehouse/shipments", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowShipModal(false);
      setShipNumber("");
      setShipTracking("");
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to dispatch shipment.");
    } finally {
      setSubmittingShip(false);
    }
  };

  const handleOpenPickModal = (pl: any) => {
    setSelectedPickList(pl);
    const initialQtys: Record<string, number> = {};
    pl.lines.forEach((line: any) => {
      initialQtys[line.id] = line.quantityToPick;
    });
    setPickedQuantities(initialQtys);
    setShowPickModal(true);
  };

  const handleCompletePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPick(true);
    setError(null);
    try {
      const payload = {
        lines: selectedPickList.lines.map((line: any) => ({
          lineId: line.id,
          quantityPicked: Number(pickedQuantities[line.id] || 0),
          binLocationId: line.binLocationId
        }))
      };

      await axios.post(`http://localhost:5000/api/warehouse/pick-lists/${selectedPickList.id}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPickModal(false);
      setSelectedPickList(null);
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete picking sheet.");
    } finally {
      setSubmittingPick(false);
    }
  };

  const handleStartStockCheck = async () => {
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/warehouse/stockcheck", 
        { notes: auditNotes }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAuditNotes("");
      alert("Stock check sheet successfully initialized for physical audit!");
      fetchWarehouseData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start stock check.");
    }
  };

  const getTranslatedName = (nameJsonStr: string) => {
    try {
      const translations = JSON.parse(nameJsonStr);
      return translations[activeLanguage] || translations["en-GB"] || "Unnamed Item";
    } catch {
      return nameJsonStr || "Unnamed Item";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Operations</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Warehouse Inventory</h2>
          <p className="text-slate-650 text-sm mt-1">Track physical goods, calculate multi-unit sale ratios, audit locations, and manage logistics dispatch flows.</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchWarehouseData}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {tab === "stock" && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowAddStockModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Define New SKU
            </button>
          )}

          {tab === "bins" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowBinModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Bin Location
            </button>
          )}

          {tab === "goodsin" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => {
                setDelNumber(`GRN-2026-000${deliveries.length + 1}`);
                setShowDeliveryModal(true);
              }}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <Download className="w-4 h-4" /> Receive Delivery (Goods In)
            </button>
          )}

          {tab === "shipments" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => {
                setShipNumber(`SH-2026-000${shipments.length + 1}`);
                setShowShipModal(true);
              }}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <Truck className="w-4 h-4" /> Dispatch Shipment
            </button>
          )}

          {tab === "adjustments" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowAdjModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Post Stock Adjustment
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTab("stock")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "stock" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Stock Levels
        </button>
        <button
          onClick={() => setTab("bins")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "bins" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Bin Locations
        </button>
        <button
          onClick={() => setTab("audits")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "audits" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Stock Audits
        </button>
        <button
          onClick={() => setTab("picks")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "picks" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Pick Lists
        </button>
        <button
          onClick={() => setTab("goodsin")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "goodsin" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Goods In (GRN)
        </button>
        <button
          onClick={() => setTab("shipments")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "shipments" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Shipments
        </button>
        <button
          onClick={() => setTab("adjustments")}
          className={`py-2 px-4 rounded-lg border transition-all ${tab === "adjustments" ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Adjustments
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        
        {/* Panel 1: Stock Levels */}
        {tab === "stock" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-violet-600" />
              Stock Item Inventory Levels
            </h3>

            {loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading inventory levels...</div>
            ) : stock.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No inventory items defined yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 text-center">Unit Ratio</th>
                      <th className="py-3 px-4 text-right">Stocking Qty</th>
                      <th className="py-3 px-4 text-right">Available Selling Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {stock.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 text-slate-700">
                        <td className="py-3 px-4 font-mono font-bold text-violet-650 flex items-center gap-1.5">
                          <span>{item.sku}</span>
                          <GoldenArrow type="item" id={item.sku} />
                        </td>
                        <td className="py-3 px-4 font-medium">{getTranslatedName(item.name)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-500">
                            1 {item.stockUnitOfSale}
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            {item.conversionRatio} {item.sellUnitOfSale}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          <div>{item.stockingQuantity} <span className="text-[10px] text-slate-400">{item.stockUnitOfSale}</span></div>
                          {item.warehouseQuantities && item.warehouseQuantities.length > 0 && (
                            <div className="text-[9px] text-slate-450 font-normal mt-1 space-y-0.5">
                              {item.warehouseQuantities.map((wh: any) => (
                                <div key={wh.warehouseId} className="flex justify-end gap-1">
                                  <span>{wh.warehouseCode}:</span>
                                  <span className="font-semibold text-slate-600">{wh.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-cyan-700">
                          <div>{item.sellingQuantity} <span className="text-[10px] text-slate-400">{item.sellUnitOfSale}</span></div>
                          {item.warehouseQuantities && item.warehouseQuantities.length > 0 && (
                            <div className="text-[9px] text-slate-450 font-normal mt-1 space-y-0.5">
                              {item.warehouseQuantities.map((wh: any) => (
                                <div key={wh.warehouseId} className="flex justify-end gap-1">
                                  <span>{wh.warehouseCode}:</span>
                                  <span className="font-semibold text-cyan-600">{wh.sellingQuantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Panel 2: Bin Locations */}
        {tab === "bins" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-600" />
              Warehouse Bins Layout
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">Advanced WMS locked</h4>
                <p className="text-[10px] text-slate-500">Subscribe to WMS package inside settings to unlock bin tracking features.</p>
              </div>
            ) : loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading bins...</div>
            ) : bins.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No bin locations defined.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {bins.map(bin => (
                  <div key={bin.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="block text-xs font-mono font-bold text-cyan-700">{bin.code}</span>
                    <span className="block text-[10px] text-slate-650">{bin.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 3: Stock Audits */}
        {tab === "audits" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-violet-600" />
              Physical Audits & Stocktaking
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">Advanced WMS locked</h4>
                <p className="text-[10px] text-slate-500">Subscribe to WMS package to initialize physical audits.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <p className="text-xs text-slate-600 leading-relaxed">Audits generate expected-stock worksheets dynamically for warehouse audits. Create a new sheet below:</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Audit description (e.g. Wall Shelf Aisle C Audit)"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 focus:bg-white text-slate-800"
                  />
                  <button
                    onClick={handleStartStockCheck}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                  >
                    Generate Audit Count Sheet
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel 4: Pick Lists */}
        {tab === "picks" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-600" />
              Outstanding Warehouse Pick Sheets
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
                <p className="text-[10px] text-slate-500">Complete sales order picking and logistics tracking inside WMS.</p>
              </div>
            ) : loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading picking sheets...</div>
            ) : pickLists.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No picking sheets created. Approve a Sales Order to generate one.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {pickLists.map((pl) => (
                  <div key={pl.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-350 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-cyan-700 text-sm">{pl.pickListNumber}</strong>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${pl.isCompleted ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                          {pl.isCompleted ? "Picked" : "Ready"}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
                        <span>Sales Ref: <strong className="text-slate-700">{pl.salesOrder?.orderNumber}</strong></span>
                        <span>Generated: <strong className="text-slate-700">{new Date(pl.createdDate).toLocaleDateString()}</strong></span>
                        {pl.isCompleted && (
                          <span>Completed by: <strong className="text-slate-700">{pl.completedByUser?.username}</strong></span>
                        )}
                      </div>
                    </div>
                    <div>
                      {!pl.isCompleted ? (
                        <button
                          onClick={() => handleOpenPickModal(pl)}
                          className="py-1 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-semibold"
                        >
                          Process Pick
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 font-semibold text-emerald-600 text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Picks Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 5: Goods In */}
        {tab === "goodsin" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Download className="w-5 h-5 text-violet-600" />
              Goods Received Notes (Incoming Deliveries)
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
                <p className="text-[10px] text-slate-500">Record incoming PO catalog items and update bin coordinates.</p>
              </div>
            ) : loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading deliveries...</div>
            ) : deliveries.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No incoming deliveries received. Click 'Receive Delivery' to begin.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {deliveries.map(d => (
                  <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
                    <div>
                      <strong className="font-mono text-cyan-700 block">{d.deliveryNumber}</strong>
                      <span className="block mt-0.5 text-slate-600">PO Ref: {d.purchaseOrder?.orderNumber}</span>
                      <span className="block mt-1 text-[10px] text-slate-500">Date: {new Date(d.deliveryDate).toLocaleDateString()} by {d.receivedByUser?.username}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Stored Bins</span>
                      {d.lines.map((line: any) => (
                        <span key={line.id} className="block font-mono text-[10px] text-violet-650 mt-0.5">
                          {line.stockItem?.sku}: {line.quantityDelivered} units in Bin {line.binLocation?.code || "Default"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 6: Shipments */}
        {tab === "shipments" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-violet-600" />
              Customer Shipments Dispatch Logs
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
                <p className="text-[10px] text-slate-500">Enable logistics shipments to dispatch customer inventory.</p>
              </div>
            ) : loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading shipments...</div>
            ) : shipments.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No outbound shipments dispatched. Click 'Dispatch Shipment' to begin.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {shipments.map(s => (
                  <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
                    <div>
                      <strong className="font-mono text-cyan-700 block">{s.shipmentNumber}</strong>
                      <span className="block mt-0.5 text-slate-650">Carrier: {s.carrier} ({s.trackingNumber})</span>
                      <span className="block mt-1 text-[10px] text-slate-500">Sales Order: {s.salesOrder?.orderNumber} | Date: {new Date(s.shippedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-50 border border-violet-200 text-violet-750 uppercase">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 7: Adjustments */}
        {tab === "adjustments" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-violet-600" />
              Manual Stock Adjustment Audit Logs
            </h3>

            {!isWmsActive ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700">WMS Module Required</h4>
                <p className="text-[10px] text-slate-500">Record stock write-offs and audits directly inside adjustments.</p>
              </div>
            ) : loading ? (
              <div className="text-slate-500 text-xs text-center py-6">Loading adjustments...</div>
            ) : adjustments.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No manual stock adjustments recorded. Click 'Post Stock Adjustment' to write one.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Product SKU</th>
                      <th className="py-3 px-4">Bin Location</th>
                      <th className="py-3 px-4 text-right">Adjustment Qty</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Auditor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {adjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-slate-55 text-slate-700">
                        <td className="py-3 px-4">{new Date(adj.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-violet-650">{adj.stockItem?.sku}</td>
                        <td className="py-3 px-4 font-mono text-cyan-700">{adj.binLocation?.code || "Default"}</td>
                        <td className={`py-3 px-4 text-right font-bold ${adj.quantityChanged > 0 ? "text-emerald-600" : "text-rose-650"}`}>
                          {adj.quantityChanged > 0 ? `+${adj.quantityChanged}` : adj.quantityChanged}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{adj.reason}</td>
                        <td className="py-3 px-4 text-slate-500">{adj.user?.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal 1: Define Stock Item */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">Define New SKU Item</h3>
            <form onSubmit={handleAddStockItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="BRK-BLUE-02"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Pallet Base Price (£)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">English Name</label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Blue Brick Pallet"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              {isPimActive && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 text-emerald-600">French Translation Name (PIM Enabled)</label>
                  <input
                    type="text"
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Palette de briques bleues"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-emerald-200 focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder="Clay brick details..."
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Stock Unit</label>
                  <input
                    type="text"
                    value={stockUnit}
                    onChange={(e) => setStockUnit(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Selling Unit</label>
                  <input
                    type="text"
                    value={sellUnit}
                    onChange={(e) => setSellUnit(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-0.5">
                    Ratio <Calculator className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="number"
                    value={ratio}
                    onChange={(e) => setRatio(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStock}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Create SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Bin Location */}
      {showBinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-600" /> Create Bin Location
            </h3>
            
            <form onSubmit={handleAddBin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Bin Location Code</label>
                <input
                  type="text"
                  required
                  value={binCode}
                  onChange={(e) => setBinCode(e.target.value)}
                  placeholder="C-02-04"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <input
                  type="text"
                  required
                  value={binDesc}
                  onChange={(e) => setBinDesc(e.target.value)}
                  placeholder="Aisle C, Rack 2, Shelf 4"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowBinModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBin}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Create Bin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Post Stock Adjustment */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-violet-600" /> Post Stock Adjustment
            </h3>
            
            <form onSubmit={handleRecordAdjustment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Select Product SKU</label>
                <select
                  value={adjStockId}
                  onChange={(e) => setAdjStockId(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                >
                  {stock.map(s => (
                    <option key={s.id} value={s.id}>{s.sku} - {getTranslatedName(s.name)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Warehouse</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Target Bin</label>
                  <select
                    value={adjBinId}
                    onChange={(e) => setAdjBinId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <option value="">No Bin</option>
                    {bins.map(b => (
                      <option key={b.id} value={b.id}>{b.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Qty Delta</label>
                  <input
                    type="number"
                    required
                    value={adjQty}
                    onChange={(e) => setAdjQty(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Reason / Notes</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Damaged stock write-off / discovered in aisle"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdj}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Receive Goods In Delivery */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-violet-600" /> Receive Purchase Order Delivery
            </h3>
            
            <form onSubmit={handleReceiveDelivery} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Select Purchase Order</label>
                <select
                  value={delPOId}
                  onChange={(e) => {
                    setDelPOId(e.target.value);
                    const po = purchaseOrders.find(p => p.id === e.target.value);
                    if (po && po.lines.length > 0) {
                      setDelQty(po.lines[0].quantity - po.lines[0].receivedQuantity);
                    }
                  }}
                  required
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                >
                  <option value="">Choose Ordered PO</option>
                  {purchaseOrders.map(p => (
                    <option key={p.id} value={p.id}>{p.orderNumber} - {p.supplier?.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">GRN Delivery Reference</label>
                <input
                  type="text"
                  required
                  value={delNumber}
                  onChange={(e) => setDelNumber(e.target.value)}
                  placeholder="GRN-2026-0002"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Warehouse</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Store in Bin</label>
                  <select
                    value={delBinId}
                    onChange={(e) => setDelBinId(e.target.value)}
                    className="w-full mt-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <option value="">No Bin</option>
                    {bins.map(b => (
                      <option key={b.id} value={b.id}>{b.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Qty Del.</label>
                  <input
                    type="number"
                    required
                    value={delQty}
                    onChange={(e) => setDelQty(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDel}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Post GRN Sheets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Dispatch Shipment */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-violet-650" /> Dispatch Customer Shipment
            </h3>
            
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Select Approved Sales Order</label>
                <select
                  value={shipSOId}
                  onChange={(e) => setShipSOId(e.target.value)}
                  required
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                >
                  <option value="">Choose SO</option>
                  {salesOrders.map(s => (
                    <option key={s.id} value={s.id}>{s.orderNumber} - {s.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Shipment Number</label>
                  <input
                    type="text"
                    required
                    value={shipNumber}
                    onChange={(e) => setShipNumber(e.target.value)}
                    placeholder="SH-2026-0002"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Carrier</label>
                  <input
                    type="text"
                    required
                    value={shipCarrier}
                    onChange={(e) => setShipCarrier(e.target.value)}
                    placeholder="DHL / DPD"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Tracking Number</label>
                <input
                  type="text"
                  required
                  value={shipTracking}
                  onChange={(e) => setShipTracking(e.target.value)}
                  placeholder="TRK-987654321-UK"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowShipModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingShip}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Complete Picking Worksheet */}
      {showPickModal && selectedPickList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Resolve Picking Sheet: {selectedPickList.pickListNumber}</h3>
            
            <form onSubmit={handleCompletePick} className="space-y-4">
              <p className="text-xs text-slate-500">Verify picked quantities from target bin locations:</p>
              
              <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-[30vh] overflow-y-auto">
                {selectedPickList.lines.map((line: any) => (
                  <div key={line.id} className="space-y-2 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{line.stockItem?.sku} - {getTranslatedName(line.stockItem?.nameJson)}</span>
                      <span className="text-[10px] text-slate-500">Target Bin: <strong className="font-mono text-cyan-700">{line.binLocation?.code || "Default"}</strong></span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-slate-500">Expected to pick: {line.quantityToPick} units</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Picked:</span>
                        <input
                          type="number"
                          required
                          value={pickedQuantities[line.id] || 0}
                          onChange={(e) => {
                            const newQtys = { ...pickedQuantities };
                            newQtys[line.id] = Number(e.target.value);
                            setPickedQuantities(newQtys);
                          }}
                          className="w-16 text-center text-xs py-1 bg-slate-55 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPickModal(false);
                    setSelectedPickList(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPick}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Complete Worksheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WarehousePage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-xs text-center py-10 animate-pulse">Loading warehouse panel...</div>}>
      <WarehousePageContent />
    </Suspense>
  );
}
