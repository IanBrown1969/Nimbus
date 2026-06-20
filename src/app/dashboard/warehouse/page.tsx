"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useApp } from "@/context/AppContext";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { 
  Plus, 
  Truck,
  Download,
  RefreshCw
} from "lucide-react";

// Tab components
import StockLevelsTab from "@/components/warehouse/StockLevelsTab";
import BinLocationsTab from "@/components/warehouse/BinLocationsTab";
import StockAuditsTab from "@/components/warehouse/StockAuditsTab";
import PickListsTab from "@/components/warehouse/PickListsTab";
import GoodsInTab from "@/components/warehouse/GoodsInTab";
import ShipmentsTab from "@/components/warehouse/ShipmentsTab";
import AdjustmentsTab from "@/components/warehouse/AdjustmentsTab";

// Modal components
import DefineStockModal from "@/components/warehouse/DefineStockModal";
import CreateBinModal from "@/components/warehouse/CreateBinModal";
import PostStockAdjustmentModal from "@/components/warehouse/PostStockAdjustmentModal";
import ReceiveDeliveryModal from "@/components/warehouse/ReceiveDeliveryModal";
import DispatchShipmentModal from "@/components/warehouse/DispatchShipmentModal";
import CompletePickModal from "@/components/warehouse/CompletePickModal";

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

  // Modal open states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState<any>(null);

  // WMS audit notes state
  const [auditNotes, setAuditNotes] = useState("");

  const isPimActive = plugins.find(p => p.code === "PIM")?.isSubscribed;
  const isWmsActive = plugins.find(p => p.code === "WMS")?.isSubscribed;

  useEffect(() => {
    if (token) {
      fetchWarehouseData();
      axios.get("http://localhost:5000/api/warehouse/warehouses", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setWarehouses(res.data);
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
      } else if (tab === "goodsin" && isWmsActive) {
        const delRes = await axios.get("http://localhost:5000/api/warehouse/deliveries", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDeliveries(delRes.data);

        const poRes = await axios.get("http://localhost:5000/api/finance/purchase-orders", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchaseOrders(poRes.data.filter((p: any) => p.status === "Ordered" || p.status === 1 || p.status === 2));

        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
      } else if (tab === "shipments" && isWmsActive) {
        const shipRes = await axios.get("http://localhost:5000/api/warehouse/shipments", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setShipments(shipRes.data);

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

        const binsRes = await axios.get("http://localhost:5000/api/warehouse/bins", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBins(binsRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load warehouse operations.");
    } finally {
      setLoading(false);
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

  const handleOpenPickModal = (pl: any) => {
    setSelectedPickList(pl);
    setShowPickModal(true);
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
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {tab === "stock" && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowAddStockModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Define New SKU
            </button>
          )}

          {tab === "bins" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowBinModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Bin Location
            </button>
          )}

          {tab === "goodsin" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowDeliveryModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Receive Delivery (Goods In)
            </button>
          )}

          {tab === "shipments" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowShipModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Truck className="w-4 h-4" /> Dispatch Shipment
            </button>
          )}

          {tab === "adjustments" && isWmsActive && (user?.role === "CompanyAdmin" || user?.role === "Warehouse") && (
            <button
              onClick={() => setShowAdjModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
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
        {(["stock", "bins", "audits", "picks", "goodsin", "shipments", "adjustments"] as const).map((tabName) => {
          const tabLabels: Record<string, string> = {
            stock: "Stock Levels",
            bins: "Bin Locations",
            audits: "Stock Audits",
            picks: "Pick Lists",
            goodsin: "Goods In (GRN)",
            shipments: "Shipments",
            adjustments: "Adjustments"
          };
          return (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`py-2 px-4 rounded-lg border transition-all cursor-pointer ${tab === tabName ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {tabLabels[tabName]}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tab === "stock" && (
          <StockLevelsTab 
            stock={stock} 
            loading={loading} 
            activeLanguage={activeLanguage} 
            getTranslatedName={getTranslatedName} 
          />
        )}

        {tab === "bins" && (
          <BinLocationsTab 
            bins={bins} 
            loading={loading} 
            isWmsActive={isWmsActive || false} 
          />
        )}

        {tab === "audits" && (
          <StockAuditsTab 
            isWmsActive={isWmsActive || false} 
            auditNotes={auditNotes} 
            setAuditNotes={setAuditNotes} 
            handleStartStockCheck={handleStartStockCheck} 
          />
        )}

        {tab === "picks" && (
          <PickListsTab 
            pickLists={pickLists} 
            loading={loading} 
            isWmsActive={isWmsActive || false} 
            onProcessPick={handleOpenPickModal} 
          />
        )}

        {tab === "goodsin" && (
          <GoodsInTab 
            deliveries={deliveries} 
            loading={loading} 
            isWmsActive={isWmsActive || false} 
          />
        )}

        {tab === "shipments" && (
          <ShipmentsTab 
            shipments={shipments} 
            loading={loading} 
            isWmsActive={isWmsActive || false} 
          />
        )}

        {tab === "adjustments" && (
          <AdjustmentsTab 
            adjustments={adjustments} 
            loading={loading} 
            isWmsActive={isWmsActive || false} 
          />
        )}
      </div>

      {/* Modals */}
      <DefineStockModal 
        isOpen={showAddStockModal} 
        onClose={() => setShowAddStockModal(false)} 
        token={token || ""} 
        isPimActive={isPimActive || false} 
        onSuccess={fetchWarehouseData} 
      />

      <CreateBinModal 
        isOpen={showBinModal} 
        onClose={() => setShowBinModal(false)} 
        token={token || ""} 
        onSuccess={fetchWarehouseData} 
      />

      <PostStockAdjustmentModal 
        isOpen={showAdjModal} 
        onClose={() => setShowAdjModal(false)} 
        token={token || ""} 
        stock={stock} 
        bins={bins} 
        warehouses={warehouses} 
        onSuccess={fetchWarehouseData} 
        getTranslatedName={getTranslatedName} 
      />

      <ReceiveDeliveryModal 
        isOpen={showDeliveryModal} 
        onClose={() => setShowDeliveryModal(false)} 
        token={token || ""} 
        purchaseOrders={purchaseOrders} 
        warehouses={warehouses} 
        bins={bins} 
        deliveriesCount={deliveries.length} 
        onSuccess={fetchWarehouseData} 
      />

      <DispatchShipmentModal 
        isOpen={showShipModal} 
        onClose={() => setShowShipModal(false)} 
        token={token || ""} 
        salesOrders={salesOrders} 
        bins={bins} 
        shipmentsCount={shipments.length} 
        onSuccess={fetchWarehouseData} 
      />

      <CompletePickModal 
        isOpen={showPickModal} 
        onClose={() => {
          setShowPickModal(false);
          setSelectedPickList(null);
        }} 
        token={token || ""} 
        pickList={selectedPickList} 
        onSuccess={fetchWarehouseData} 
        getTranslatedName={getTranslatedName} 
      />
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
