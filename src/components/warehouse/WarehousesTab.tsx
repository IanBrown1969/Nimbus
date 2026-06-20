"use client";
 
import React, { useState } from "react";
import axios from "axios";
import { 
  Building2, 
  Search, 
  X, 
  Edit2, 
  Plus, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  MapPin
} from "lucide-react";
import GoldenArrow from "@/components/common/GoldenArrow";
 
interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
}
 
interface WarehousesTabProps {
  warehouses: Warehouse[];
  loading: boolean;
  token: string;
  onSuccess: () => void;
  userRole?: string;
}
 
export default function WarehousesTab({
  warehouses,
  loading,
  token,
  onSuccess,
  userRole,
}: WarehousesTabProps) {
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
 
  // Form States
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const handleSelectWarehouse = (wh: Warehouse) => {
    setIsCreateMode(false);
    setSelectedWarehouse(wh);
    setEditCode(wh.code || "");
    setEditName(wh.name || "");
    setEditAddress(wh.address || "");
    setError(null);
  };
 
  const handleOpenCreateDrawer = () => {
    setIsCreateMode(true);
    setSelectedWarehouse({ id: 0, code: "", name: "", address: "" });
    setEditCode("");
    setEditName("");
    setEditAddress("");
    setError(null);
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
 
    try {
      const payload = {
        code: editCode,
        name: editName,
        address: editAddress === "" ? null : editAddress
      };
 
      if (isCreateMode) {
        await axios.post("http://localhost:5000/api/warehouse/warehouses", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Warehouse successfully defined!");
      } else if (selectedWarehouse) {
        await axios.post(`http://localhost:5000/api/warehouse/warehouses/${selectedWarehouse.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Warehouse details successfully updated!");
      }
 
      onSuccess();
      setSelectedWarehouse(null);
      setIsCreateMode(false);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save warehouse.");
    } finally {
      setSubmitting(false);
    }
  };
 
  const filteredWarehouses = warehouses.filter(wh => 
    wh.code.toLowerCase().includes(search.toLowerCase()) ||
    wh.name.toLowerCase().includes(search.toLowerCase()) ||
    (wh.address || "").toLowerCase().includes(search.toLowerCase())
  );
 
  const isAdmin = userRole === "CompanyAdmin" || userRole === "GlobalAdmin";
 
  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-600" />
          Warehouse Locations Directory
        </h3>
 
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by code, name..."
              className="w-full sm:w-60 text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 shadow-sm"
            />
          </div>
 
          {isAdmin && (
            <button
              onClick={handleOpenCreateDrawer}
              className="py-2 px-3.5 rounded-xl font-semibold bg-violet-650 hover:bg-violet-500 text-white shadow-sm flex items-center gap-1.5 text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Define Warehouse
            </button>
          )}
        </div>
      </div>
 
      {loading ? (
        <div className="text-slate-500 text-xs text-center py-10 animate-pulse">Loading warehouses...</div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-10">No warehouse locations matched your filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/75">
                <th className="py-3.5 px-5">Code</th>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Physical Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredWarehouses.map((wh) => (
                <tr 
                  key={wh.id} 
                  onClick={() => handleSelectWarehouse(wh)}
                  className="hover:bg-slate-50/65 text-slate-700 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-5 font-mono font-bold text-cyan-750 flex items-center gap-1.5">
                    <span>{wh.code}</span>
                    <GoldenArrow type="warehouse" id={wh.code} />
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{wh.name}</td>
                  <td className="py-3.5 px-5 text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{wh.address || <span className="italic text-slate-350">No address defined</span>}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* View / Edit / Create Slide-over Drawer */}
      {selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest block font-mono">
                  {isCreateMode ? "New Location" : editCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-5 h-5 text-violet-650" /> 
                  {isCreateMode ? "Define New Warehouse" : `${editName} Location`}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedWarehouse(null)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
 
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Edit2 className="w-3.5 h-3.5 text-violet-600" /> Warehouse Specifications
              </h4>
 
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
 
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Warehouse Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="e.g. WH-NORTH"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
 
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Warehouse Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Leeds Distribution Hub"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
 
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Physical Address</label>
                  <textarea
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. Unit 4, Logic Park, Leeds, LS15 0AA"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    rows={3}
                  />
                </div>
              </div>
 
              {/* Actions */}
              <div className="flex gap-3 justify-end pt-5 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedWarehouse(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!isAdmin && !isCreateMode)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> 
                      {isCreateMode ? "Create Location" : "Save Location Specs"}
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
