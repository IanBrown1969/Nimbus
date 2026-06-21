"use client";
 
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Puzzle, ShieldAlert, BadgeCheck, Loader2, ShieldCheck, Cloud, Settings, X } from "lucide-react";

export default function PluginsSettingsPage() {
  const { plugins, togglePlugin, updatePluginConfig, user, layout, setLayout } = useApp();
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  // CDN configuration modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConfiguringActive, setIsConfiguringActive] = useState(false); // true if modifying an active plugin
  const [connString, setConnString] = useState("");
  const [containerName, setContainerName] = useState("");
  const [cdnEndpoint, setCdnEndpoint] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggle = async (code: string, currentIsSubscribed: boolean) => {
    const isAdmin = user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin";
    if (!isAdmin) return;

    if (code === "CDN" && !currentIsSubscribed) {
      // Open configuration modal for activation
      setIsConfiguringActive(false);
      setValidationError(null);
      setConnString("");
      setContainerName("invoices");
      setCdnEndpoint("");
      setShowConfigModal(true);
      return;
    }

    setUpdatingCode(code);
    try {
      await togglePlugin(code);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleOpenModifyConfig = (plugin: any) => {
    setIsConfiguringActive(true);
    setValidationError(null);
    try {
      if (plugin.configurationSettingsJson) {
        const settings = JSON.parse(plugin.configurationSettingsJson);
        setConnString(settings.connectionString || "");
        setContainerName(settings.containerName || "");
        setCdnEndpoint(settings.cdnEndpointUrl || "");
      } else {
        setConnString("");
        setContainerName("invoices");
        setCdnEndpoint("");
      }
    } catch {
      setConnString("");
      setContainerName("invoices");
      setCdnEndpoint("");
    }
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!connString.trim() || !containerName.trim() || !cdnEndpoint.trim()) {
      setValidationError("All configuration settings fields are required.");
      return;
    }

    const config = {
      connectionString: connString.trim(),
      containerName: containerName.trim(),
      cdnEndpointUrl: cdnEndpoint.trim()
    };
    const configJson = JSON.stringify(config);

    setUpdatingCode("CDN");
    try {
      if (isConfiguringActive) {
        // Just update config
        const success = await updatePluginConfig("CDN", configJson);
        if (success) {
          alert("Azure Cloud Storage & CDN configuration successfully updated!");
          setShowConfigModal(false);
        } else {
          setValidationError("Failed to update plugin configuration. Please check your storage settings.");
        }
      } else {
        // Toggle on with config
        const isSubscribed = await togglePlugin("CDN", configJson);
        if (isSubscribed) {
          setShowConfigModal(false);
        } else {
          setValidationError("Failed to activate module. Please check your storage connection string and settings.");
        }
      }
    } catch (err: any) {
      setValidationError(err.response?.data?.message || "An unexpected error occurred.");
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

      {/* User Interface Layout Selection */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Admin Dashboard Layout</h3>
          <p className="text-xs text-slate-500 mt-1">Choose your preferred navigation style. Changes are applied instantly and persisted locally.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Classic Sidebar Card */}
          <button
            onClick={() => setLayout("sidebar")}
            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all bg-white cursor-pointer select-none ${
              layout === "sidebar"
                ? "border-violet-300 ring-1 ring-violet-100 shadow-md shadow-violet-100/50"
                : "border-slate-200 hover:border-slate-350"
            }`}
          >
            {/* Visual Mini Preview representation */}
            <div className="w-20 h-16 bg-slate-50 border border-slate-200 rounded-lg flex shrink-0 overflow-hidden">
              <div className="w-6 bg-slate-200 border-r border-slate-300 flex flex-col gap-1 p-1">
                <div className="w-full h-2 bg-slate-400 rounded-sm"></div>
                <div className="w-full h-1 bg-slate-305 rounded-sm"></div>
                <div className="w-full h-1 bg-slate-305 rounded-sm"></div>
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                <div className="w-2/3 h-2 bg-slate-300 rounded-sm"></div>
                <div className="w-full h-5 bg-slate-100 border border-slate-200 rounded-sm"></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Classic Sidebar
                {layout === "sidebar" && (
                  <span className="text-[8px] font-extrabold bg-violet-100 text-violet-750 px-1.5 py-0.5 rounded-full uppercase">Active</span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Traditional vertical navigation layout with collapsible accordions, localization indicators, and drilldowns at your fingertips.
              </p>
            </div>
          </button>

          {/* Modern Top Navigation Card */}
          <button
            onClick={() => setLayout("topnav")}
            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all bg-white cursor-pointer select-none ${
              layout === "topnav"
                ? "border-violet-300 ring-1 ring-violet-100 shadow-md shadow-violet-100/50"
                : "border-slate-200 hover:border-slate-350"
            }`}
          >
            {/* Visual Mini Preview representation */}
            <div className="w-20 h-16 bg-slate-50 border border-slate-200 rounded-lg flex flex-col shrink-0 overflow-hidden">
              <div className="h-4 bg-slate-200 border-b border-slate-300 flex items-center gap-1.5 px-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                <div className="w-6 h-1.5 bg-slate-305 rounded-sm"></div>
                <div className="w-6 h-1.5 bg-slate-305 rounded-sm"></div>
              </div>
              <div className="flex-1 p-1.5">
                <div className="w-2/3 h-2 bg-slate-300 rounded-sm mb-1"></div>
                <div className="w-full h-4 bg-slate-100 border border-slate-200 rounded-sm"></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Modern Top Navigation
                {layout === "topnav" && (
                  <span className="text-[8px] font-extrabold bg-violet-100 text-violet-750 px-1.5 py-0.5 rounded-full uppercase">Active</span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Clean, full-width canvas workspace with a blur-effect sticky top header and dropdown menus. Maximizes visual data area.
              </p>
            </div>
          </button>
        </div>
      </div>

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
                  : "border-slate-200 hover:border-slate-350"
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
              <div className="mt-8 space-y-2">
                {plugin.isSubscribed && plugin.code === "CDN" && (
                  <button
                    onClick={() => handleOpenModifyConfig(plugin)}
                    disabled={isUpdating || !isAdmin}
                    className="w-full py-2 px-4 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" /> Modify Storage Settings
                  </button>
                )}
                {plugin.isSubscribed ? (
                  <button
                    onClick={() => handleToggle(plugin.code, true)}
                    disabled={isUpdating || !isAdmin}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Deactivate Module"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(plugin.code, false)}
                    disabled={isUpdating || !isAdmin}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      plugin.code === "CDN" ? "Configure & Activate" : "Subscribe & Activate"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CDN Storage Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-violet-650" />
                {isConfiguringActive ? "Update Azure Cloud Settings" : "Configure Azure Cloud Settings"}
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)} 
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs leading-relaxed">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Azure Blob Connection String</label>
                <input
                  type="text"
                  required
                  value={connString}
                  onChange={(e) => setConnString(e.target.value)}
                  placeholder="DefaultEndpointsProtocol=https;AccountName=..."
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Blob Container Name</label>
                  <input
                    type="text"
                    required
                    value={containerName}
                    onChange={(e) => setContainerName(e.target.value)}
                    placeholder="invoices"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">CDN Endpoint URL</label>
                  <input
                    type="text"
                    required
                    value={cdnEndpoint}
                    onChange={(e) => setCdnEndpoint(e.target.value)}
                    placeholder="https://nimbus.azureedge.net"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCode === "CDN"}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatingCode === "CDN" ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </>
                  ) : (
                    isConfiguringActive ? "Save Settings" : "Save & Activate"
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
