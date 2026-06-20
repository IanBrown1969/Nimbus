"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Boxes, 
  Receipt, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  Globe, 
  Coins 
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, activeLanguage, activeCurrency, plugins, logout } = useApp();

  useEffect(() => {
    // Redirect to login if not authenticated
    const savedToken = localStorage.getItem("nimbus_token");
    if (!savedToken && !token) {
      router.push("/login");
    }
  }, [token]);

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400 text-sm">
        Loading session...
      </div>
    );
  }

  // Find active plugins for display badges
  const isPimActive = plugins.find(p => p.code === "PIM")?.isSubscribed;
  const isWmsActive = plugins.find(p => p.code === "WMS")?.isSubscribed;
  const isSupActive = plugins.find(p => p.code === "SUP")?.isSubscribed;

  const menuItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      visible: true
    },
    {
      name: "Warehouse & Stock",
      href: "/dashboard/warehouse",
      icon: Boxes,
      visible: true,
      badge: isWmsActive ? "WMS" : (isPimActive ? "PIM" : null)
    },
    {
      name: "Finance & Accounts",
      href: "/dashboard/finance",
      icon: Receipt,
      visible: true,
      badge: isSupActive ? "SUP" : null
    },
    {
      name: "Marketplace Add-ons",
      href: "/dashboard/settings/plugins",
      icon: Settings,
      visible: user.role === "CompanyAdmin" || user.role === "GlobalAdmin"
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-68 border-r border-slate-900 bg-slate-900/40 backdrop-blur-md flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-900 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">
            N
          </div>
          <div>
            <span className="font-bold tracking-wide text-slate-200">Nimbus ERP</span>
            <span className="block text-[10px] text-slate-500 font-medium font-heading uppercase tracking-widest">{user.tenantName}</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems
            .filter(item => item.visible)
            .map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? "bg-violet-600/10 border border-violet-500/20 text-violet-300" 
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isActive ? "text-violet-400" : "text-slate-500"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* User Info & Settings footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40 space-y-4">
          {/* User Badge */}
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800/40">
            <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="block text-xs font-semibold text-slate-200 truncate">{user.username}</span>
              <span className="block text-[9px] font-bold text-violet-400 uppercase tracking-widest">{user.role}</span>
            </div>
          </div>

          {/* Localization details */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-slate-600" /> {activeLanguage}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-slate-600" /> {activeCurrency}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full py-2.5 px-3 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
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
    </div>
  );
}
