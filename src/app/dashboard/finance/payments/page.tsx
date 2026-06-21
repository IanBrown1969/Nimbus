"use client";

import React, { useState } from "react";
import { 
  CreditCard, 
  Settings2, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  ArrowUpRight, 
  CheckCircle, 
  RefreshCw, 
  Sliders, 
  Search, 
  DollarSign, 
  ToggleLeft, 
  ToggleRight,
  ExternalLink
} from "lucide-react";

interface Gateway {
  id: string;
  name: string;
  provider: string;
  status: "active" | "inactive";
  settlementAccount: string;
  processingFee: string;
}

interface PaymentTransaction {
  id: string;
  date: string;
  customerName: string;
  reference: string;
  amount: number;
  gateway: string;
  status: "settled" | "processing" | "failed";
}

export default function PaymentManagementPage() {
  const [gateways, setGateways] = useState<Gateway[]>([
    { id: "GW-01", name: "Stripe Card Processing", provider: "Stripe API v3", status: "active", settlementAccount: "1200 - Barclays Current", processingFee: "1.4% + 20p" },
    { id: "GW-02", name: "PayPal Express Checkout", provider: "PayPal Commerce", status: "active", settlementAccount: "1210 - PayPal Holding", processingFee: "2.9% + 30p" },
    { id: "GW-03", name: "BACS Direct Debit", provider: "GoCardless Integration", status: "inactive", settlementAccount: "1200 - Barclays Current", processingFee: "1.0% Max £2.00" },
    { id: "GW-04", name: "Apple Pay & Google Wallet", provider: "Stripe Link", status: "active", settlementAccount: "1200 - Barclays Current", processingFee: "1.4% + 20p" }
  ]);

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([
    { id: "PAY-10029", date: "2026-06-21 08:12", customerName: "John & Builders Ltd", reference: "INV-2026-1049", amount: 450.00, gateway: "Stripe", status: "settled" },
    { id: "PAY-10028", date: "2026-06-20 17:45", customerName: "Acme Holdings Corp", reference: "INV-2026-1048", amount: 3200.00, gateway: "PayPal", status: "settled" },
    { id: "PAY-10027", date: "2026-06-20 12:22", customerName: "Vanguard Tech Inc", reference: "INV-2026-1047", amount: 1540.00, gateway: "Stripe", status: "processing" },
    { id: "PAY-10026", date: "2026-06-19 09:30", customerName: "Starlight Media", reference: "INV-2026-1045", amount: 95.00, gateway: "Stripe", status: "failed" },
    { id: "PAY-10025", date: "2026-06-18 15:10", customerName: "Phoenix Logistics", reference: "INV-2026-1044", amount: 780.00, gateway: "Stripe", status: "settled" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeGatewayId, setActiveGatewayId] = useState<string | null>(null);

  const toggleGatewayStatus = (id: string) => {
    setGateways(prev => prev.map(gw => {
      if (gw.id === id) {
        return {
          ...gw,
          status: gw.status === "active" ? "inactive" : "active"
        };
      }
      return gw;
    }));
  };

  const filteredTx = transactions.filter(t => 
    t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Merchant & Collections</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Payment Management</h2>
          <p className="text-slate-655 text-sm mt-1">Configure customer collection gateways, map payment settlement ledgers, and audit clearing logs.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Clear Pending Settlements
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Processed (MTD)</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£18,460.00</span>
            <span className="block text-[10px] text-emerald-600 font-semibold mt-1">112 successfully cleared</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Settlement Duration</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">T+2 Days</span>
            <span className="text-[10px] text-slate-450 font-semibold">Standard Stripe Roll</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gateway Fees Accrued</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£258.44</span>
            <span className="block text-[10px] text-slate-500 mt-1">Charged directly to COGS-Finance</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Integrations</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">3 Gateways</span>
            <span className="block text-[10px] text-emerald-600 font-semibold mt-1">GoCardless Pending Setup</span>
          </div>
        </div>
      </div>

      {/* Main layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gateways Settings List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Payment Collection Methods</h3>
              <p className="text-xs text-slate-500 mt-0.5">Toggle and configure available payment channels for A/R Invoices checkout links.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gateways.map((gw) => (
                <div 
                  key={gw.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all bg-white ${
                    gw.status === "active" 
                      ? "border-violet-300 ring-1 ring-violet-100 shadow-md shadow-violet-100/30" 
                      : "border-slate-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{gw.name}</h4>
                        <span className="text-[9px] font-mono text-slate-450 block mt-0.5">{gw.provider}</span>
                      </div>
                      <button 
                        onClick={() => toggleGatewayStatus(gw.id)}
                        className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        {gw.status === "active" ? (
                          <ToggleRight className="w-9 h-6 text-violet-600 fill-violet-100" />
                        ) : (
                          <ToggleLeft className="w-9 h-6 text-slate-350" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Clearing Account</span>
                        <span className="font-semibold text-slate-850">{gw.settlementAccount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Fees Agreement</span>
                        <span className="font-semibold text-slate-850">{gw.processingFee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button 
                      onClick={() => setActiveGatewayId(activeGatewayId === gw.id ? null : gw.id)}
                      className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                      Configure API Keys
                    </button>
                  </div>

                  {/* Inline active config fields */}
                  {activeGatewayId === gw.id && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Merchant Secret Key</label>
                        <input 
                          type="password" 
                          placeholder="sk_live_••••••••••••••••••••" 
                          className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Webhook Signing Signature</label>
                        <input 
                          type="password" 
                          placeholder="whsec_••••••••••••••••" 
                          className="w-full mt-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          alert("Gateway credentials successfully updated and authenticated!");
                          setActiveGatewayId(null);
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Save & Test Connection
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions log Column (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Clearing & Settlements</h3>
              <p className="text-[11px] text-slate-505">Audit trail of transactions routed via merchant networks.</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850"
              />
            </div>

            <div className="space-y-3.5">
              {filteredTx.map((t) => (
                <div 
                  key={t.id}
                  className="p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-850">{t.customerName}</span>
                    <strong className="text-slate-900">£{t.amount.toFixed(2)}</strong>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1 font-mono uppercase">
                      {t.id} • {t.gateway}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] ${
                      t.status === "settled" 
                        ? "bg-emerald-50 border border-emerald-250 text-emerald-700" 
                        : t.status === "processing" 
                        ? "bg-sky-50 border border-sky-250 text-sky-700" 
                        : "bg-rose-50 border border-rose-250 text-rose-700"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
