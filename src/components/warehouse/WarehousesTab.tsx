"use client";
 
import React, { useState, useEffect } from "react";
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
  addressLine1?: string;
  addressLine2?: string | null;
  addressLine3?: string | null;
  city?: string;
  postalCode?: string;
  countryId?: number | null;
  country?: any | null;
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
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [editAddressLine3, setEditAddressLine3] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCountryId, setEditCountryId] = useState<number | "">("");
  const [countries, setCountries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      axios.get("http://localhost:5000/api/countries", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setCountries(res.data);
      }).catch(err => {
        console.error("Failed to load countries", err);
      });
    }
  }, [token]);
 
  const handleSelectWarehouse = (wh: Warehouse) => {
    setIsCreateMode(false);
    setSelectedWarehouse(wh);
    setEditCode(wh.code || "");
    setEditName(wh.name || "");
    setEditAddressLine1(wh.addressLine1 || "");
    setEditAddressLine2(wh.addressLine2 || "");
    setEditAddressLine3(wh.addressLine3 || "");
    setEditCity(wh.city || "");
    setEditPostalCode(wh.postalCode || "");
    setEditCountryId(wh.countryId || "");
    setError(null);
  };
 
  const handleOpenCreateDrawer = () => {
    setIsCreateMode(true);
    setSelectedWarehouse({ id: 0, code: "", name: "", addressLine1: "", addressLine2: "", addressLine3: "", city: "", postalCode: "", countryId: null });
    setEditCode("");
    setEditName("");
    setEditAddressLine1("");
    setEditAddressLine2("");
    setEditAddressLine3("");
    setEditCity("");
    setEditPostalCode("");
    setEditCountryId("");
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
        addressLine1: editAddressLine1,
        addressLine2: editAddressLine2 === "" ? null : editAddressLine2,
        addressLine3: editAddressLine3 === "" ? null : editAddressLine3,
        city: editCity,
        postalCode: editPostalCode,
        countryId: editCountryId === "" ? null : Number(editCountryId)
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
    (wh.addressLine1 || "").toLowerCase().includes(search.toLowerCase()) ||
    (wh.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (wh.postalCode || "").toLowerCase().includes(search.toLowerCase()) ||
    (wh.country?.name || "").toLowerCase().includes(search.toLowerCase())
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
                  <td className="py-3.5 px-5 text-slate-505 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {wh.addressLine1 ? (
                        <>
                          {wh.addressLine1}
                          {wh.addressLine2 && `, ${wh.addressLine2}`}
                          {wh.addressLine3 && `, ${wh.addressLine3}`}
                          {`, ${wh.city}`}
                          {`, ${wh.postalCode}`}
                          {wh.country && `, ${wh.country.name}`}
                        </>
                      ) : (
                        <span className="italic text-slate-350">No address defined</span>
                      )}
                    </span>
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
 
                <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4">
                  <span className="block text-[10px] font-bold uppercase text-slate-600">Physical Location Address</span>
                  
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 1</label>
                    <input
                      type="text"
                      required
                      value={editAddressLine1}
                      onChange={(e) => setEditAddressLine1(e.target.value)}
                      placeholder="e.g. Unit 4, Logic Park"
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={editAddressLine2}
                        onChange={(e) => setEditAddressLine2(e.target.value)}
                        placeholder="e.g. Leeds Road"
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 3 (Optional)</label>
                      <input
                        type="text"
                        value={editAddressLine3}
                        onChange={(e) => setEditAddressLine3(e.target.value)}
                        placeholder="e.g. Thorpe Park"
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">City</label>
                      <input
                        type="text"
                        required
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Leeds"
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Postcode</label>
                      <input
                        type="text"
                        required
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                        placeholder="e.g. LS15 0AA"
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Country</label>
                      <select
                        required
                        value={editCountryId}
                        onChange={(e) => setEditCountryId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      >
                        <option value="">Select Country</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
