"use client";
 
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { 
  LayoutDashboard, 
  Boxes, 
  Receipt, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  Globe, 
  Coins,
  ChevronDown,
  ChevronRight,
  BookOpen,
  TrendingUp,
  ShoppingBag,
  Users,
  Sliders,
  Lock
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, activeLanguage, activeCurrency, plugins, logout } = useApp();

  // Collapsible modules state
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    financials: true,
    sales: false,
    purchasing: false,
    banking: false,
    inventory: false,
    hr: false,
    admin: false
  });

  // Drilldown drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drilldownData, setDrilldownData] = useState<{ type: string; id: string | number } | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownDetail, setDrilldownDetail] = useState<any>(null);

  const toggleModule = (moduleKey: string) => {
    setOpenModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  useEffect(() => {
    const handleDrilldownEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, id } = customEvent.detail;
      setDrilldownData({ type, id });
      setDrawerOpen(true);
      setDrilldownLoading(true);
      setDrilldownDetail(null);
      
      try {
        let res: any = null;
        if (type === "item") {
          res = await axios.get("http://localhost:5000/api/warehouse/stock", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const found = res.data.find((item: any) => item.sku === id || item.id == id);
          setDrilldownDetail(found || { sku: id, name: JSON.stringify({ "en-GB": "Item not found in catalog" }) });
        } else if (type === "supplier") {
          res = await axios.get("http://localhost:5000/api/finance/suppliers", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const found = res.data.find((s: any) => s.id == id || s.name === id);
          setDrilldownDetail(found || { name: id, email: "N/A", address: "Supplier details not found" });
        } else if (type === "invoice") {
          res = await axios.get("http://localhost:5000/api/finance/invoices", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const found = res.data.find((inv: any) => inv.id == id || inv.invoiceNumber === id);
          setDrilldownDetail(found || { invoiceNumber: id, customerName: "Invoice not found" });
        }
      } catch (err) {
        console.error("Drilldown fetch failed", err);
      } finally {
        setDrilldownLoading(false);
      }
    };

    window.addEventListener("nimbus-drilldown", handleDrilldownEvent);
    return () => {
      window.removeEventListener("nimbus-drilldown", handleDrilldownEvent);
    };
  }, [token]);

  useEffect(() => {
    // Redirect to login if not authenticated
    const savedToken = localStorage.getItem("nimbus_token");
    if (!savedToken && !token) {
      router.push("/login");
    }
  }, [token]);

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-sm">
        Loading session...
      </div>
    );
  }

  // Find active plugins for display badges
  const isPimActive = plugins.find(p => p.code === "PIM")?.isSubscribed;
  const isWmsActive = plugins.find(p => p.code === "WMS")?.isSubscribed;
  const isSupActive = plugins.find(p => p.code === "SUP")?.isSubscribed;

  const modules = [
    {
      key: "financials",
      name: "Financials",
      icon: BookOpen,
      items: [
        { name: "Ledger Dashboard", href: "/dashboard/finance" },
        { name: "Chart of Accounts", href: "/dashboard/finance/accounts" },
        { name: "VAT Returns (HMRC)", href: "/dashboard/finance/vat" }
      ]
    },
    {
      key: "sales",
      name: "Sales - A/R",
      icon: TrendingUp,
      items: [
        { name: "Sales Quotations", href: "/dashboard/finance/quotes" },
        { name: "Sales Orders", href: "/dashboard/finance/sales-orders" },
        { name: "A/R Invoices", href: "/dashboard/finance" }, // maps back to GL invoices list
        { name: "A/R Credit Notes", href: "/dashboard/finance/credit-notes" }
      ]
    },
    {
      key: "purchasing",
      name: "Purchasing - A/P",
      icon: ShoppingBag,
      locked: !isSupActive,
      badge: "SUP",
      items: [
        { name: "Supplier Directory", href: "/dashboard/finance" },
        { name: "Purchase Orders", href: "/dashboard/finance" },
        { name: "Supplier Bills (A/P)", href: "/dashboard/finance/supplier-bills" }
      ]
    },
    {
      key: "banking",
      name: "Banking",
      icon: Coins,
      items: [
        { name: "Bank Feeds & Cash", href: "/dashboard/finance/bank" }
      ]
    },
    {
      key: "inventory",
      name: "Inventory",
      icon: Boxes,
      badge: isWmsActive ? "WMS" : (isPimActive ? "PIM" : null),
      items: [
        { name: "Item Master Data", href: "/dashboard/warehouse" },
        { name: "Bin Locations", href: "/dashboard/warehouse" },
        { name: "Physical Audits", href: "/dashboard/warehouse" },
        { name: "Picks & Dispatch", href: "/dashboard/warehouse" },
        { name: "Goods In / Receipt", href: "/dashboard/warehouse" },
        { name: "Outbound Shipments", href: "/dashboard/warehouse" },
        { name: "Stock Adjustments", href: "/dashboard/warehouse" }
      ]
    },
    {
      key: "hr",
      name: "Human Resources",
      icon: Users,
      items: [
        { name: "Payroll runs", href: "/dashboard/finance/payroll" },
        { name: "Expense claims", href: "/dashboard/finance/claims" }
      ]
    },
    {
      key: "admin",
      name: "Administration",
      icon: Sliders,
      items: [
        { name: "Fixed Assets", href: "/dashboard/finance/assets" },
        { name: "Marketplace Add-ons", href: "/dashboard/settings/plugins" }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-68 border-r border-slate-200 bg-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">
            N
          </div>
          <div>
            <span className="font-bold tracking-wide text-slate-800">Nimbus ERP</span>
            <span className="block text-[10px] text-slate-500 font-medium font-heading uppercase tracking-widest">{user.tenantName}</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
          {/* Overview Link */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              pathname === "/dashboard"
                ? "bg-violet-50 border-violet-100 text-violet-750 font-bold"
                : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Overview Dashboard</span>
          </Link>

          {/* Module Accoridons */}
          {modules.map(mod => {
            const ModIcon = mod.icon;
            const isOpen = openModules[mod.key];

            return (
              <div key={mod.key} className="space-y-1 pt-1">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(mod.key)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ModIcon className="w-4.5 h-4.5 text-slate-500" />
                    <span className="flex items-center gap-1.5">
                      {mod.name}
                      {mod.locked && <Lock className="w-3 h-3 text-rose-500/70" />}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {mod.badge && (
                      <span className="px-1 py-0.5 rounded text-[8px] font-extrabold bg-cyan-50 border border-cyan-200 text-cyan-700">
                        {mod.badge}
                      </span>
                    )}
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Module Sub-items */}
                {isOpen && (
                  <div className="pl-6 border-l border-slate-200 ml-5 space-y-1 pb-1 pt-0.5">
                    {mod.items.map(item => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`block px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            isActive
                              ? "bg-violet-50 text-violet-700 font-bold"
                              : "text-slate-550 hover:text-slate-900"
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info & Settings footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-4">
          {/* User Badge */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="block text-xs font-semibold text-slate-800 truncate">{user.username}</span>
              <span className="block text-[9px] font-bold text-violet-600 uppercase tracking-widest">{user.role}</span>
            </div>
          </div>

          {/* Localization details */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-slate-400" /> {activeLanguage}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-slate-400" /> {activeCurrency}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full py-2.5 px-3 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto px-10 py-8">
        {children}
      </main>

      {/* Drilldown Drawer Panel */}
      {drawerOpen && drilldownData && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between transition-transform duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">SAP B1 Drilldown</span>
                <h3 className="text-base font-bold text-slate-800 uppercase">{drilldownData.type} Master Card</h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300"
              >
                Close
              </button>
            </div>

            {drilldownLoading ? (
              <div className="text-slate-500 text-xs text-center py-10">Fetching master record...</div>
            ) : drilldownDetail ? (
              <div className="space-y-4 text-xs">
                {drilldownData.type === "item" && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Item Code (SKU)</span>
                      <strong className="text-slate-800 text-sm font-mono">{drilldownDetail.sku}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Description</span>
                      <strong className="text-slate-800 text-xs font-sans block mt-1">{getTranslatedVal(drilldownDetail.name)}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Sales UoM</span>
                        <span className="text-slate-700 font-mono">{drilldownDetail.sellUnitOfSale || "Each"}</span>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Base Price</span>
                        <span className="text-slate-700 font-mono">£{drilldownDetail.basePrice}</span>
                      </div>
                    </div>
                  </>
                )}
                {drilldownData.type === "supplier" && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Supplier Name</span>
                      <strong className="text-slate-800 text-sm">{drilldownDetail.name}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Email Address</span>
                      <span className="text-slate-700">{drilldownDetail.email}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Registered Address</span>
                      <span className="text-slate-700 block mt-1 leading-relaxed">{drilldownDetail.address}</span>
                    </div>
                  </>
                )}
                {drilldownData.type === "invoice" && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Invoice Ref</span>
                      <strong className="text-slate-800 font-mono text-sm">{drilldownDetail.invoiceNumber}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer Card</span>
                      <span className="text-slate-700">{drilldownDetail.customerName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Net</span>
                        <span className="text-slate-700 font-mono">£{drilldownDetail.totalNet}</span>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Tax</span>
                        <span className="text-slate-700 font-mono">£{drilldownDetail.totalTax}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-slate-500 text-xs text-center py-10">Record details unavailable.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getTranslatedVal(nameJsonStr: string) {
  try {
    const translations = JSON.parse(nameJsonStr);
    return translations["en-GB"] || nameJsonStr;
  } catch {
    return nameJsonStr;
  }
}
