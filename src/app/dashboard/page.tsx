"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Building, 
  Puzzle, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Languages, 
  DollarSign, 
  PackageSearch,
  Landmark,
  BarChart3,
  Activity,
  ArrowUpRight
} from "lucide-react";

export default function DashboardOverview() {
  const { token, user, activeLanguage, activeCurrency, plugins, setLanguage } = useApp();

  const [skusCount, setSkusCount] = useState(0);
  const [ledgerBalanced, setLedgerBalanced] = useState<boolean | null>(null);
  const [activeSubCount, setActiveSubCount] = useState(0);
  const [invoiceSum, setInvoiceSum] = useState(0.0);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Interactivity states
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredBank, setHoveredBank] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      fetchOverviewData();
    }
  }, [token, plugins]);

  const fetchOverviewData = async () => {
    try {
      // 1. Get stock count
      const stockRes = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkusCount(stockRes.data.length);

      // 2. Count active plugins
      const activeSubs = plugins.filter(p => p.isSubscribed).length;
      setActiveSubCount(activeSubs);

      // 3. Get Invoice Sum and double-entry General Ledger balancing checks
      const invoiceRes = await axios.get("http://localhost:5000/api/finance/invoices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invoices = invoiceRes.data;
      const sum = invoices.reduce((acc: number, inv: any) => acc + inv.totalGross, 0);
      setInvoiceSum(sum);

      const ledgerRes = await axios.get("http://localhost:5000/api/finance/ledger", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const entries = ledgerRes.data;
      
      let allBalanced = true;
      if (entries.length > 0) {
        for (const entry of entries) {
          const debits = entry.lines.reduce((acc: number, l: any) => acc + l.debit, 0);
          const credits = entry.lines.reduce((acc: number, l: any) => acc + l.credit, 0);
          if (Math.abs(debits - credits) > 0.01) {
            allBalanced = false;
            break;
          }
        }
      }
      setLedgerBalanced(entries.length > 0 ? allBalanced : true);

      // 4. Get bank accounts
      try {
        const bankRes = await axios.get("http://localhost:5000/api/finance/bank/accounts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBankAccounts(bankRes.data);
      } catch (bankErr) {
        console.error("Failed to load bank accounts in overview:", bankErr);
      }

    } catch (err) {
      console.error("Failed to load overview metrics:", err);
    }
  };

  // Locale language switch options
  const languages = [
    { code: "en-GB", label: "British English (GBP)" },
    { code: "fr-FR", label: "French (EUR)" }
  ];

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: activeCurrency
    }).format(val);
  };

  const formatMoneyShort = (val: number) => {
    const symbol = activeCurrency === "EUR" ? "€" : "£";
    if (val >= 1000) {
      return `${symbol}${(val / 1000).toFixed(1)}k`;
    }
    return `${symbol}${val.toFixed(0)}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(activeLanguage, {
      dateStyle: "full",
      timeStyle: "short"
    }).format(date);
  };

  // Line Chart computations (Jan - Jun)
  const monthlyData = [
    { name: "Jan", value: 12500 },
    { name: "Feb", value: 14200 },
    { name: "Mar", value: 18600 },
    { name: "Apr", value: 16100 },
    { name: "May", value: 22400 },
    { name: "Jun", value: invoiceSum || 0 },
  ];

  const maxVal = Math.max(...monthlyData.map(d => d.value), 25000);
  const getX = (index: number) => 50 + index * 75; // index 0..5 -> X 50..425
  const getY = (val: number) => 150 - (maxVal > 0 ? (val / maxVal) * 110 : 0); // Y ranges 40..150

  const getCurvePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const points = monthlyData.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const strokePath = getCurvePath(points);
  const fillPath = `${strokePath} L 425 150 L 50 150 Z`;

  // Bar Chart computations (Bank Accounts)
  const displayAccounts = bankAccounts.length > 0 ? bankAccounts : [
    { accountName: "Barclays Current", currentBalance: 14850.20, accountNumber: "******3241" },
    { accountName: "HSBC Savings", currentBalance: 28400.00, accountNumber: "******7892" },
    { accountName: "Cash Petty Drawer", currentBalance: 850.50, accountNumber: "******0000" }
  ];
  const maxBalance = Math.max(...displayAccounts.map(a => a.currentBalance), 10000);
  const barCount = displayAccounts.length;
  const chartWidth = 400;
  const barSpacing = chartWidth / barCount;
  const barWidth = Math.min(36, barSpacing * 0.5);

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Welcome Back</span>
          <h2 className="text-2xl font-bold font-heading text-slate-800 mt-1">{user?.username}</h2>
          <p className="text-slate-500 text-xs mt-1">Logged into {user?.tenantName} dashboard console.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs shadow-sm">
          <Building className="w-4 h-4 text-violet-600" />
          <span>Tenant Domain: <strong>{user?.tenantId ? String(user.tenantId).substring(0,8) : "N/A"}</strong></span>
        </div>
      </div>

      {/* Interactive Localization Panel */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-cyan-600" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Active Localization Context</h4>
            <p className="text-[10px] text-slate-500">Dates, currency rates, and labels adjust dynamically based on this selection.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeLanguage === lang.code
                  ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SKUs */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock SKUs</span>
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <PackageSearch className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{skusCount}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Catalog items defined</span>
          </div>
        </div>

        {/* Invoice Total */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Billings</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{formatMoney(invoiceSum)}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Total invoiced sales</span>
          </div>
        </div>

        {/* Subscribed Plugins */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add-on Modules</span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <Puzzle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-heading text-slate-850">{activeSubCount} / 3</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Paid plugins subscribed</span>
          </div>
        </div>

        {/* General Ledger Balancing Check */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UK Ledger Audit</span>
            {ledgerBalanced === true ? (
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            ) : (
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600 animate-bounce">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-850">
              {ledgerBalanced === true ? "Debit = Credit" : (ledgerBalanced === false ? "Unbalanced!" : "No Entries")}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-1">
              {ledgerBalanced === true ? "HMRC double-entry compliant" : "Compliance warning!"}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Performance Analytics Console */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Sales Performance Line Chart */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-violet-650" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Monthly Revenue Trend</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-150">
              <ArrowUpRight className="w-3 h-3" /> Live Billings Linked
            </span>
          </div>

          <div className="relative h-[220px] w-full select-none">
            <svg viewBox="0 0 500 220" className="w-full h-full">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                const yVal = maxVal * pct;
                const yCoord = getY(yVal);
                return (
                  <g key={idx}>
                    <line x1="50" y1={yCoord} x2="470" y2={yCoord} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3,3" />
                    <text x="40" y={yCoord + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono font-bold">
                      {formatMoneyShort(yVal)}
                    </text>
                  </g>
                );
              })}

              {/* Zero baseline */}
              <line x1="50" y1="150" x2="470" y2="150" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="40" y="153" textAnchor="end" className="text-[9px] fill-slate-400 font-mono font-bold">£0</text>

              {/* Area Under Curve */}
              {strokePath && (
                <path d={fillPath} fill="url(#areaGradient)" />
              )}

              {/* Main Line Stroke */}
              {strokePath && (
                <path d={strokePath} fill="none" stroke="url(#lineGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Data Nodes */}
              {monthlyData.map((d, i) => {
                const active = hoveredMonth === i;
                return (
                  <g key={i}>
                    {active && (
                      <>
                        <line x1={getX(i)} y1="30" x2={getX(i)} y2="150" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,3" />
                        <circle cx={getX(i)} cy={getY(d.value)} r="9" fill="#8b5cf6" fillOpacity="0.2" />
                      </>
                    )}
                    <circle 
                      cx={getX(i)} 
                      cy={getY(d.value)} 
                      r={active ? 5.5 : 4} 
                      fill={active ? "#ec4899" : "#8b5cf6"} 
                      stroke="#ffffff" 
                      strokeWidth="2" 
                      className="transition-all duration-150"
                    />
                    <text x={getX(i)} y="172" textAnchor="middle" className="text-[10px] font-semibold fill-slate-500 font-sans">
                      {d.name}
                    </text>
                    {/* Hover hotspot */}
                    <circle
                      cx={getX(i)}
                      cy={getY(d.value)}
                      r="25"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonth(i)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredMonth !== null && (
              <div 
                className="absolute bg-white/95 border border-slate-200 shadow-xl rounded-2xl p-2.5 px-3.5 z-20 backdrop-blur-sm pointer-events-none transition-all duration-150 ease-out text-xs"
                style={{ 
                  left: `${((getX(hoveredMonth) - 10) / 500) * 100}%`, 
                  top: `${((getY(monthlyData[hoveredMonth].value) - 45) / 220) * 100}%`,
                  transform: "translateX(-50%)" 
                }}
              >
                <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">{monthlyData[hoveredMonth].name} Performance</div>
                <div className="font-extrabold text-slate-800 text-sm mt-0.5">{formatMoney(monthlyData[hoveredMonth].value)}</div>
                {hoveredMonth > 0 && (
                  <div className="text-[9px] font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5">
                    {monthlyData[hoveredMonth].value >= monthlyData[hoveredMonth - 1].value ? "+" : ""}
                    {(((monthlyData[hoveredMonth].value - monthlyData[hoveredMonth - 1].value) / (monthlyData[hoveredMonth - 1].value || 1)) * 100).toFixed(1)}% vs prev month
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Cash Position Chart */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-4.5 h-4.5 text-violet-650" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Cash Position by Account</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-violet-750 font-bold px-1.5 py-0.5 rounded bg-violet-50 border border-violet-150">
              <BarChart3 className="w-3 h-3" /> Liquidity Analysis
            </span>
          </div>

          <div className="relative h-[220px] w-full select-none">
            <svg viewBox="0 0 500 220" className="w-full h-full">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                const val = maxBalance * pct;
                const yCoord = 150 - (val / maxBalance) * 110;
                return (
                  <g key={idx}>
                    <line x1="50" y1={yCoord} x2="470" y2={yCoord} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3,3" />
                    <text x="40" y={yCoord + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono font-bold">
                      {formatMoneyShort(val)}
                    </text>
                  </g>
                );
              })}

              {/* Zero baseline */}
              <line x1="50" y1="150" x2="470" y2="150" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="40" y="153" textAnchor="end" className="text-[9px] fill-slate-400 font-mono font-bold">£0</text>

              {/* Rounded Bars */}
              {displayAccounts.map((acc, i) => {
                const barY = 150 - (maxBalance > 0 ? (acc.currentBalance / maxBalance) * 110 : 0);
                const barHeight = maxBalance > 0 ? (acc.currentBalance / maxBalance) * 110 : 0;
                const startX = 50 + i * barSpacing + (barSpacing - barWidth) / 2;
                const active = hoveredBank === i;

                return (
                  <g key={i}>
                    {/* Background track bar */}
                    <rect 
                      x={startX} 
                      y={40} 
                      width={barWidth} 
                      height={110} 
                      rx="6" 
                      fill="#f8fafc" 
                    />
                    
                    {/* Real Value Bar */}
                    <rect 
                      x={startX} 
                      y={barY} 
                      width={barWidth} 
                      height={barHeight} 
                      rx="6" 
                      fill={active ? "url(#lineGradient)" : "url(#barGradient)"} 
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredBank(i)}
                      onMouseLeave={() => setHoveredBank(null)}
                    />

                    {/* Account Name Label */}
                    <text 
                      x={startX + barWidth / 2} 
                      y="172" 
                      textAnchor="middle" 
                      className={`text-[9px] font-bold font-sans transition-colors ${active ? "fill-violet-650" : "fill-slate-500"}`}
                    >
                      {acc.accountName.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredBank !== null && (
              <div 
                className="absolute bg-white/95 border border-slate-200 shadow-xl rounded-2xl p-2.5 px-3.5 z-20 backdrop-blur-sm pointer-events-none transition-all duration-150 ease-out text-xs"
                style={{ 
                  left: `${(((50 + hoveredBank * barSpacing + (barSpacing - barWidth) / 2) + barWidth / 2 - 10) / 500) * 100}%`, 
                  top: `${(((150 - (displayAccounts[hoveredBank].currentBalance / maxBalance) * 110) - 45) / 220) * 100}%`,
                  transform: "translateX(-50%)" 
                }}
              >
                <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">{displayAccounts[hoveredBank].accountName}</div>
                <div className="font-extrabold text-slate-800 text-sm mt-0.5">{formatMoney(displayAccounts[hoveredBank].currentBalance)}</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">No: {displayAccounts[hoveredBank].accountNumber}</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Date Display */}
      <div className="text-right text-[10px] text-slate-500">
        System Date: {formatDate(new Date())}
      </div>
    </div>
  );
}
