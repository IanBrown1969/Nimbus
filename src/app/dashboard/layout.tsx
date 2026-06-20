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
  const { token, user, activeLanguage, activeCurrency, plugins, logout, layout, permissions } = useApp();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
        } else if (type === "customer") {
          res = await axios.get("http://localhost:5000/api/customers", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const found = res.data.find((c: any) => c.id == id || c.name === id || c.customerRef === id);
          setDrilldownDetail(found || { name: id, email: "N/A", phone: "N/A", customerRef: "N/A", addresses: [] });
        } else if (type === "warehouse") {
          res = await axios.get("http://localhost:5000/api/warehouse/warehouses", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const found = res.data.find((w: any) => w.code === id || w.id == id);
          setDrilldownDetail(found || { code: id, name: "Warehouse not found", address: "N/A" });
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
      name: "Finance",
      icon: BookOpen,
      items: [
        { name: "Ledger Dashboard", href: "/dashboard/finance" },
        { name: "Chart of Accounts", href: "/dashboard/finance/accounts" },
        { name: "VAT Returns (HMRC)", href: "/dashboard/finance/vat" }
      ]
    },
    {
      key: "sales",
      name: "Sales",
      icon: TrendingUp,
      items: [
        { name: "Customers", href: "/dashboard/finance/customers" },
        { name: "Sales Quotations", href: "/dashboard/finance/quotes" },
        { name: "Sales Orders", href: "/dashboard/finance/sales-orders" },
        { name: "A/R Invoices", href: "/dashboard/finance" },
        { name: "A/R Credit Notes", href: "/dashboard/finance/credit-notes" }
      ]
    },
    {
      key: "purchasing",
      name: "Purchasing",
      icon: ShoppingBag,
      locked: !isSupActive,
      badge: "SUP",
      items: [
        { name: "Supplier Directory", href: "/dashboard/finance" },
        { name: "Purchase Orders", href: "/dashboard/finance/purchase-orders" },
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
        { name: "Item Master Data", href: "/dashboard/warehouse?tab=stock" },
        { name: "Bin Locations", href: "/dashboard/warehouse?tab=bins" },
        { name: "Physical Audits", href: "/dashboard/warehouse?tab=audits" },
        { name: "Picks & Dispatch", href: "/dashboard/warehouse?tab=picks" },
        { name: "Goods In / Receipt", href: "/dashboard/warehouse?tab=goodsin" },
        { name: "Outbound Shipments", href: "/dashboard/warehouse?tab=shipments" },
        { name: "Stock Adjustments", href: "/dashboard/warehouse?tab=adjustments" },
        { name: "Pricing Rules Setup", href: "/dashboard/settings/pricing" }
      ]
    },
    {
      key: "hr",
      name: "HR",
      icon: Users,
      items: [
        { name: "Payroll runs", href: "/dashboard/finance/payroll" },
        { name: "Expense claims", href: "/dashboard/finance/claims" }
      ]
    },
    {
      key: "admin",
      name: "Admin",
      icon: Sliders,
      items: [
        { name: "Fixed Assets", href: "/dashboard/finance/assets" },
        { name: "Marketplace Add-ons", href: "/dashboard/settings/plugins" },
        { name: "Role Permissions (RBAC)", href: "/dashboard/settings/rbac" }
      ]
    }
  ];

  const allowedModules = modules.filter(mod => {
    if (user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin") return true;
    return permissions && permissions.includes(mod.key);
  });

  const moduleKey = getModuleKeyForPath(pathname);
  const isAllowed = (() => {
    if (user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin") return true;
    if (!moduleKey) return true;
    if (moduleKey === "financials-sales-purchasing") {
      return (
        permissions.includes("financials") ||
        permissions.includes("sales") ||
        permissions.includes("purchasing")
      );
    }
    return permissions.includes(moduleKey);
  })();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {layout === "topnav" ? (
        <div className="flex flex-col flex-1 min-h-screen">
          {/* Sticky Header Topnav Layout */}
          <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              
              {/* Left section: Logo & Nav Links */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">
                    N
                  </div>
                  <div className="hidden sm:block">
                    <span className="font-bold tracking-wide text-slate-800 text-sm block leading-none">Nimbus ERP</span>
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1 truncate max-w-[120px]">{user.tenantName}</span>
                  </div>
                </div>

                {/* Horizontal Navigation Menu */}
                <nav className="hidden lg:flex items-center gap-1">
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                      pathname === "/dashboard"
                        ? "bg-violet-50 border-violet-100 text-violet-750 font-bold"
                        : "border-transparent text-slate-655 hover:bg-slate-50 hover:text-slate-850"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Overview</span>
                  </Link>

                  {allowedModules.map(mod => {
                    const ModIcon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        className="relative py-2"
                        onMouseEnter={() => setActiveDropdown(mod.key)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-655 hover:bg-slate-50 hover:text-slate-850 transition-all whitespace-nowrap cursor-pointer">
                          <ModIcon className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{mod.name}</span>
                          {mod.locked && <Lock className="w-2.5 h-2.5 text-rose-500/70 shrink-0" />}
                          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                        </button>

                        {activeDropdown === mod.key && (
                          <div 
                            className="absolute top-full left-0 mt-0.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                            onMouseEnter={() => setActiveDropdown(mod.key)}
                            onMouseLeave={() => setActiveDropdown(null)}
                          >
                            {mod.items.map(item => {
                              const isActive = pathname === item.href;
                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  className={`block px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                                    isActive
                                      ? "bg-violet-50 text-violet-750 font-bold"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
              </div>

              {/* Right section: Compact User Profile Dropdown */}
              <div 
                className="relative"
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left hidden md:block pr-1 max-w-[100px] truncate">
                    <span className="block text-xs font-bold text-slate-800 leading-tight truncate">{user.username}</span>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">{user.role}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-750 flex items-center justify-center font-bold text-base">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-900 leading-none">{user.username}</span>
                        <span className="inline-block text-[9px] font-bold text-violet-650 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 mt-1.5 uppercase tracking-wider">{user.role}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium"><Globe className="w-4 h-4 text-slate-400" /> Language</span>
                        <span className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">{activeLanguage}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium"><Coins className="w-4 h-4 text-slate-400" /> Currency</span>
                        <span className="font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">{activeCurrency}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={() => {
                          logout();
                          router.push("/login");
                        }}
                        className="w-full py-2 px-3 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* Page Canvas */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
            {isAllowed ? children : <AccessDeniedView path={pathname} />}
          </main>
        </div>
      ) : (
        <>
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
              {allowedModules.map(mod => {
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
            {isAllowed ? children : <AccessDeniedView path={pathname} />}
          </main>
        </>
      )}

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
                {drilldownData.type === "customer" && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer Ref</span>
                      <strong className="text-slate-800 font-mono text-sm">{drilldownDetail.customerRef}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer Name</span>
                      <strong className="text-slate-800 text-sm">{drilldownDetail.name}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Company</span>
                      <span className="text-slate-700">{drilldownDetail.companyName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Email</span>
                        <span className="text-slate-750 font-mono break-all">{drilldownDetail.email}</span>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Phone</span>
                        <span className="text-slate-750 font-mono">{drilldownDetail.phone}</span>
                      </div>
                    </div>
                    
                    {/* Billing Addresses */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Billing Addresses</h4>
                      {drilldownDetail.addresses && drilldownDetail.addresses.filter((a: any) => a.addressType === "Billing").length === 0 ? (
                        <span className="text-slate-500 italic text-[11px] block">No billing addresses defined.</span>
                      ) : (
                        drilldownDetail.addresses?.filter((a: any) => a.addressType === "Billing").map((addr: any) => (
                          <div key={addr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                            <span className="block font-bold text-slate-700">
                              {addr.addressName} {addr.isDefault && <span className="text-[8px] font-bold bg-violet-100 text-violet-750 px-1 py-0.2 rounded uppercase">Default</span>}
                            </span>
                            <span className="block text-slate-650">{addr.addressLine1} {addr.addressLine2 && `, ${addr.addressLine2}`}</span>
                            <span className="block text-slate-650">{addr.city}, {addr.postalCode}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Shipping Addresses */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Shipping Addresses</h4>
                      {drilldownDetail.addresses && drilldownDetail.addresses.filter((a: any) => a.addressType === "Shipping").length === 0 ? (
                        <span className="text-slate-500 italic text-[11px] block">No shipping addresses defined.</span>
                      ) : (
                        drilldownDetail.addresses?.filter((a: any) => a.addressType === "Shipping").map((addr: any) => (
                          <div key={addr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                            <span className="block font-bold text-slate-700">
                              {addr.addressName} {addr.isDefault && <span className="text-[8px] font-bold bg-violet-100 text-violet-750 px-1 py-0.2 rounded uppercase">Default</span>}
                            </span>
                            <span className="block text-slate-650">{addr.addressLine1} {addr.addressLine2 && `, ${addr.addressLine2}`}</span>
                            <span className="block text-slate-650">{addr.city}, {addr.postalCode}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
                {drilldownData.type === "warehouse" && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Warehouse Code</span>
                      <strong className="text-slate-800 font-mono text-sm">{drilldownDetail.code}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Warehouse Name</span>
                      <strong className="text-slate-800 text-sm">{drilldownDetail.name}</strong>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Physical Address</span>
                      <span className="text-slate-755 block mt-1 leading-relaxed">{drilldownDetail.address || "No address defined"}</span>
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

function getModuleKeyForPath(path: string): string | null {
  if (path === "/dashboard" || path === "/dashboard/") return null;

  if (path.startsWith("/dashboard/settings/rbac")) return "admin";
  if (path.startsWith("/dashboard/settings/plugins")) return "admin";
  if (path.startsWith("/dashboard/settings/pricing")) return "inventory";

  if (path === "/dashboard/finance" || path === "/dashboard/finance/") {
    return "financials-sales-purchasing";
  }
  if (path.startsWith("/dashboard/finance/accounts")) return "financials";
  if (path.startsWith("/dashboard/finance/vat")) return "financials";

  if (path.startsWith("/dashboard/finance/customers")) return "sales";
  if (path.startsWith("/dashboard/finance/quotes")) return "sales";
  if (path.startsWith("/dashboard/finance/sales-orders")) return "sales";
  if (path.startsWith("/dashboard/finance/credit-notes")) return "sales";

  if (path.startsWith("/dashboard/finance/purchase-orders")) return "purchasing";
  if (path.startsWith("/dashboard/finance/supplier-bills")) return "purchasing";

  if (path.startsWith("/dashboard/finance/bank")) return "banking";

  if (path.startsWith("/dashboard/warehouse")) return "inventory";

  if (path.startsWith("/dashboard/finance/payroll")) return "hr";
  if (path.startsWith("/dashboard/finance/claims")) return "hr";

  if (path.startsWith("/dashboard/finance/assets")) return "admin";

  return null;
}

function AccessDeniedView({ path }: { path: string }) {
  const router = useRouter();
  
  const key = getModuleKeyForPath(path);
  let moduleName = "this area";
  if (key === "financials") moduleName = "Finance (Financials)";
  else if (key === "sales") moduleName = "Sales Module";
  else if (key === "purchasing") moduleName = "Purchasing Module";
  else if (key === "banking") moduleName = "Banking & Feeds";
  else if (key === "inventory") moduleName = "Inventory & Warehouse";
  else if (key === "hr") moduleName = "Human Resources (HR)";
  else if (key === "admin") moduleName = "System Administration (Admin)";
  else if (key === "financials-sales-purchasing") moduleName = "Finance / Sales / Purchasing Hub";

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-10 max-w-md w-full text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-violet-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-rose-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Lock className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight font-heading">
          Access Restricted
        </h3>
        <p className="text-slate-505 text-xs mt-3 leading-relaxed">
          Your active role does not have the necessary permissions to access <strong className="text-slate-700 font-bold">{moduleName}</strong>.
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Security Policy</span>
          <span className="block text-[11px] text-slate-650 leading-normal">
            Permissions are managed dynamically by your company's System Administrator via the Role-Based Access Control panel.
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-98"
          >
            Go to Overview Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
