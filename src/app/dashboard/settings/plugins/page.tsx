"use client";
 
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Puzzle, ShieldAlert, BadgeCheck, Loader2, ShieldCheck } from "lucide-react";

export default function PluginsSettingsPage() {
  const { plugins, togglePlugin, user } = useApp();
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  const handleToggle = async (code: string) => {
    setUpdatingCode(code);
    try {
      await togglePlugin(code);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCode(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Settings</span>
        <h2 className="text-3xl font-bold font-heading text-slate-900">Marketplace Add-ons</h2>
        <p className="text-slate-600 text-sm mt-1">Manage paid plugin extensions. Enabling these modules unlocks database columns and custom API routing.</p>
      </div>

      {/* Base Subscription Card */}
      {user && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-violet-50 border border-violet-200 rounded-2xl text-violet-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Nimbus Base Plan</span>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {(user as any).subscriptionPlan || "Standard"} Plan
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 border border-emerald-250 text-emerald-700 uppercase tracking-wider">
                  {(user as any).subscriptionStatus || "Active"}
                </span>
              </h3>
              <p className="text-xs text-slate-655 mt-1">
                Your company {user.tenantName} is currently subscribed monthly to Nimbus ERP.
              </p>
            </div>
          </div>
          <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-slate-200 pt-4 md:pt-0">
            <span className="text-slate-500 text-xs md:text-sm">Monthly Subscription Cost</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">£{(user as any).planPrice || 59.99}</span>
              <span className="text-[10px] text-slate-550 font-semibold">/ month</span>
            </div>
          </div>
        </div>
      )}

      {/* Access alert if user is not admin */}
      {user?.role !== "CompanyAdmin" && user?.role !== "GlobalAdmin" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-250 text-amber-800 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span>You do not have administration rights. Only Company Administrators can subscribe or unsubscribe to marketplace plugins.</span>
        </div>
      )}

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plugins.map((plugin) => {
          const isUpdating = updatingCode === plugin.code;
          const isAdmin = user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin";

          return (
            <div 
              key={plugin.id} 
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all bg-white shadow-sm ${
                plugin.isSubscribed 
                  ? "border-violet-300 ring-1 ring-violet-100 shadow-lg shadow-violet-100/50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-4">
                {/* Header Icon + Price */}
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl border ${
                    plugin.isSubscribed 
                      ? "bg-violet-50 border-violet-200 text-violet-650" 
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    <Puzzle className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-slate-800">£{plugin.monthlyPrice}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold">per month</span>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    {plugin.name}
                    {plugin.isSubscribed && (
                      <BadgeCheck className="w-4.5 h-4.5 text-violet-650 fill-white" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-655 mt-2 leading-relaxed">{plugin.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8">
                {plugin.isSubscribed ? (
                  <button
                    onClick={() => handleToggle(plugin.code)}
                    disabled={isUpdating || !isAdmin}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Deactivate Module"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(plugin.code)}
                    disabled={isUpdating || !isAdmin}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Subscribe & Activate"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
