"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Percent, Map, Plus, Trash2, Landmark, Globe, Check, ShieldAlert, Loader2, RefreshCw, Pencil } from "lucide-react";

interface Country {
    id: number;
    code: string;
    iso3: string;
    name: string;
    isBaseCountry: boolean;
    isActive: boolean;
    taxZoneId: number | null;
    taxZone?: { id: number; name: string };
}

interface TaxZone {
    id: number;
    name: string;
    description?: string;
    countries?: Country[];
}

interface TaxClass {
    id: number;
    code: string;
    name: string;
}

interface TaxRate {
    id: number;
    baseCountryId: number;
    baseCountry: Country;
    deliveryCountryId: number | null;
    deliveryCountry: Country | null;
    deliveryZoneId: number | null;
    deliveryZone: TaxZone | null;
    taxClassId: number;
    taxClass: TaxClass;
    rate: number;
}

export default function TaxSetupPage() {
    const { token, user } = useApp();
    const [countries, setCountries] = useState<Country[]>([]);
    const [zones, setZones] = useState<TaxZone[]>([]);
    const [taxClasses, setTaxClasses] = useState<TaxClass[]>([]);
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Zone Creation Form
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneDesc, setNewZoneDesc] = useState("");
    const [isCreatingZone, setIsCreatingZone] = useState(false);

    // Rate Creation Form
    const [newRateBaseId, setNewRateBaseId] = useState<number | "">("");
    const [newRateDestType, setNewRateDestType] = useState<"country" | "zone">("country");
    const [newRateDeliveryId, setNewRateDeliveryId] = useState<number | "">("");
    const [newRateZoneId, setNewRateZoneId] = useState<number | "">("");
    const [newRateClassId, setNewRateClassId] = useState<number | "">("");
    const [newRatePercent, setNewRatePercent] = useState<number | "">("");
    const [isCreatingRate, setIsCreatingRate] = useState(false);

    // Zone Edit Form Modal State
    const [editingZone, setEditingZone] = useState<TaxZone | null>(null);
    const [editZoneName, setEditZoneName] = useState("");
    const [editZoneDesc, setEditZoneDesc] = useState("");
    const [editZoneCountryIds, setEditZoneCountryIds] = useState<number[]>([]);
    const [isSavingZone, setIsSavingZone] = useState(false);

    // Rate Edit Form Modal State
    const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
    const [editRateBaseId, setEditRateBaseId] = useState<number | "">("");
    const [editRateDestType, setEditRateDestType] = useState<"country" | "zone">("country");
    const [editRateDeliveryId, setEditRateDeliveryId] = useState<number | "">("");
    const [editRateZoneId, setEditRateZoneId] = useState<number | "">("");
    const [editRateClassId, setEditRateClassId] = useState<number | "">("");
    const [editRatePercent, setEditRatePercent] = useState<number | "">("");
    const [isSavingRate, setIsSavingRate] = useState(false);

    // Edit Base Countries State
    const [isEditingBaseCountries, setIsEditingBaseCountries] = useState(false);
    const [baseSearchQuery, setBaseSearchQuery] = useState("");

    // Tax Class Creation Form
    const [newClassCode, setNewClassCode] = useState("");
    const [newClassName, setNewClassName] = useState("");
    const [isCreatingClass, setIsCreatingClass] = useState(false);

    // Tax Class Edit Form Modal State
    const [editingClass, setEditingClass] = useState<TaxClass | null>(null);
    const [editClassCode, setEditClassCode] = useState("");
    const [editClassName, setEditClassName] = useState("");
    const [isSavingClass, setIsSavingClass] = useState(false);

    // Custom Deletion Confirmation State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {}
    });

    const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const isAdmin = user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin";
    const canManageTax = isAdmin || user?.role === "Accounts";

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [countriesRes, zonesRes, classesRes, ratesRes] = await Promise.all([
                axios.get("http://localhost:5000/api/countries/all", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("http://localhost:5000/api/finance/tax/zones", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("http://localhost:5000/api/finance/tax/classes", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("http://localhost:5000/api/finance/tax/rates", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setCountries(countriesRes.data);
            setZones(zonesRes.data);
            setTaxClasses(classesRes.data);
            setRates(ratesRes.data);
            
            // Set defaults for form
            const baseList = countriesRes.data.filter((c: Country) => c.isBaseCountry && c.isActive);
            if (baseList.length > 0) {
                setNewRateBaseId(baseList[0].id);
            }
            const activeList = countriesRes.data.filter((c: Country) => c.isActive);
            if (activeList.length > 0) {
                setNewRateDeliveryId(activeList[0].id);
            }
            if (zonesRes.data.length > 0) {
                setNewRateZoneId(zonesRes.data[0].id);
            }
            if (classesRes.data.length > 0) {
                setNewRateClassId(classesRes.data[0].id);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to load tax setup information.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || !newZoneName.trim()) return;

        setIsCreatingZone(true);
        setError(null);
        try {
            const res = await axios.post("http://localhost:5000/api/finance/tax/zones", {
                name: newZoneName.trim(),
                description: newZoneDesc.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setZones([...zones, res.data]);
            setNewZoneName("");
            setNewZoneDesc("");
            showSuccess("Tax Zone created successfully!");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create tax zone.");
        } finally {
            setIsCreatingZone(false);
        }
    };

    const handleDeleteZone = (id: number) => {
        if (!canManageTax) return;
        requestConfirm(
            "Delete Tax Zone",
            "Are you sure you want to delete this tax zone? Countries mapped to it will be unassigned.",
            async () => {
                setError(null);
                try {
                    await axios.delete(`http://localhost:5000/api/finance/tax/zones/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setZones(zones.filter(z => z.id !== id));
                    showSuccess("Tax Zone deleted successfully.");
                } catch (err: any) {
                    setError("Failed to delete tax zone.");
                }
            }
        );
    };

    const handleCreateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || newRateBaseId === "" || newRateClassId === "" || newRatePercent === "") return;

        const isCountry = newRateDestType === "country";
        if (isCountry && newRateDeliveryId === "") return;
        if (!isCountry && newRateZoneId === "") return;

        setIsCreatingRate(true);
        setError(null);
        try {
            const res = await axios.post("http://localhost:5000/api/finance/tax/rates", {
                baseCountryId: Number(newRateBaseId),
                deliveryCountryId: isCountry ? Number(newRateDeliveryId) : null,
                deliveryZoneId: !isCountry ? Number(newRateZoneId) : null,
                taxClassId: Number(newRateClassId),
                rate: Number(newRatePercent) / 100
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRates([...rates, res.data]);
            setNewRatePercent("");
            showSuccess("Tax Rate rule added successfully!");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to add tax rate rule.");
        } finally {
            setIsCreatingRate(false);
        }
    };

    const handleDeleteRate = (id: number) => {
        if (!canManageTax) return;
        requestConfirm(
            "Delete Tax Rate Rule",
            "Are you sure you want to delete this tax rate rule?",
            async () => {
                setError(null);
                try {
                    await axios.delete(`http://localhost:5000/api/finance/tax/rates/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setRates(rates.filter(r => r.id !== id));
                    showSuccess("Tax Rate rule deleted successfully.");
                } catch (err: any) {
                    setError("Failed to delete tax rate rule.");
                }
            }
        );
    };

    const openEditZone = (zone: TaxZone) => {
        setEditingZone(zone);
        setEditZoneName(zone.name);
        setEditZoneDesc(zone.description || "");
        const mapped = countries.filter(c => c.taxZoneId === zone.id).map(c => c.id);
        setEditZoneCountryIds(mapped);
    };

    const toggleEditZoneCountry = (countryId: number) => {
        setEditZoneCountryIds(prev => 
            prev.includes(countryId) 
                ? prev.filter(id => id !== countryId) 
                : [...prev, countryId]
        );
    };

    const handleUpdateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || !editingZone || !editZoneName.trim()) return;

        setIsSavingZone(true);
        setError(null);
        try {
            await axios.put(`http://localhost:5000/api/finance/tax/zones/${editingZone.id}`, {
                name: editZoneName.trim(),
                description: editZoneDesc.trim(),
                countryIds: editZoneCountryIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            await fetchData();
            setEditingZone(null);
            showSuccess("Tax Zone updated successfully!");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update tax zone.");
        } finally {
            setIsSavingZone(false);
        }
    };

    const openEditRate = (rate: TaxRate) => {
        setEditingRate(rate);
        setEditRateBaseId(rate.baseCountryId);
        setEditRateClassId(rate.taxClassId);
        setEditRatePercent(rate.rate * 100);
        if (rate.deliveryZoneId) {
            setEditRateDestType("zone");
            setEditRateZoneId(rate.deliveryZoneId);
            setEditRateDeliveryId("");
        } else {
            setEditRateDestType("country");
            setEditRateDeliveryId(rate.deliveryCountryId || "");
            setEditRateZoneId("");
        }
    };

    const handleUpdateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || !editingRate || editRateBaseId === "" || editRateClassId === "" || editRatePercent === "") return;

        const isCountry = editRateDestType === "country";
        if (isCountry && editRateDeliveryId === "") return;
        if (!isCountry && editRateZoneId === "") return;

        setIsSavingRate(true);
        setError(null);
        try {
            await axios.put(`http://localhost:5000/api/finance/tax/rates/${editingRate.id}`, {
                baseCountryId: Number(editRateBaseId),
                deliveryCountryId: isCountry ? Number(editRateDeliveryId) : null,
                deliveryZoneId: !isCountry ? Number(editRateZoneId) : null,
                taxClassId: Number(editRateClassId),
                rate: Number(editRatePercent) / 100
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            await fetchData();
            setEditingRate(null);
            showSuccess("Tax Rate rule updated successfully!");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update tax rate rule.");
        } finally {
            setIsSavingRate(false);
        }
    };

    const handleToggleBaseCountry = async (id: number) => {
        if (!canManageTax) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/countries/${id}/toggle-base`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCountries(prev => 
                prev.map(c => c.id === id ? { ...c, isBaseCountry: !c.isBaseCountry } : c)
            );
            showSuccess(res.data.message || "Base country status updated.");
        } catch (err: any) {
            setError("Failed to update base country status.");
        }
    };

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || !newClassCode.trim() || !newClassName.trim()) return;

        setIsCreatingClass(true);
        setError(null);
        try {
            const res = await axios.post("http://localhost:5000/api/finance/tax/classes", {
                code: newClassCode.trim().toUpperCase(),
                name: newClassName.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTaxClasses([...taxClasses, res.data]);
            setNewClassCode("");
            setNewClassName("");
            showSuccess("Tax Class created successfully!");
        } catch (err: any) {
            setError(err.response?.data || err.response?.data?.message || "Failed to create tax class.");
        } finally {
            setIsCreatingClass(false);
        }
    };

    const openEditClass = (tc: TaxClass) => {
        setEditingClass(tc);
        setEditClassCode(tc.code);
        setEditClassName(tc.name);
    };

    const handleUpdateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTax || !editingClass || !editClassCode.trim() || !editClassName.trim()) return;

        setIsSavingClass(true);
        setError(null);
        try {
            await axios.put(`http://localhost:5000/api/finance/tax/classes/${editingClass.id}`, {
                code: editClassCode.trim().toUpperCase(),
                name: editClassName.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            await fetchData();
            setEditingClass(null);
            showSuccess("Tax Class updated successfully!");
        } catch (err: any) {
            setError(err.response?.data || err.response?.data?.message || "Failed to update tax class.");
        } finally {
            setIsSavingClass(false);
        }
    };

    const handleDeleteClass = (id: number) => {
        if (!canManageTax) return;
        requestConfirm(
            "Delete Tax Class",
            "Are you sure you want to delete this tax class?",
            async () => {
                setError(null);
                try {
                    await axios.delete(`http://localhost:5000/api/finance/tax/classes/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setTaxClasses(taxClasses.filter(tc => tc.id !== id));
                    showSuccess("Tax Class deleted successfully.");
                } catch (err: any) {
                    setError(err.response?.data || err.response?.data?.message || "Failed to delete tax class. Make sure it is not in use.");
                }
            }
        );
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => {
            setSuccessMsg(null);
        }, 3000);
    };

    // Filter active lookup lists
    const activeBaseCountries = countries.filter(c => c.isBaseCountry && c.isActive);
    const activeCountries = countries.filter(c => c.isActive);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading font-bold">Tax Management</span>
                    <h2 className="text-3xl font-bold font-heading text-slate-900">Tax Setup & Zones</h2>
                    <p className="text-slate-660 text-sm mt-1">Establish your base operating countries, map states and regions into Tax Zones, and configure matrix rules to auto-resolve tax percentages on orders.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold self-start cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5">
                    <Check className="w-4.5 h-4.5 text-emerald-600" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Base Company Operating Hubs */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Base Operating Countries</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-sans leading-none">Operating countries established for your tenant company.</p>
                    </div>
                    {canManageTax && !isEditingBaseCountries && (
                        <button
                            onClick={() => setIsEditingBaseCountries(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold cursor-pointer"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit Base Countries
                        </button>
                    )}
                </div>
                
                {loading ? (
                    <div className="h-20 bg-slate-50 rounded-2xl border border-slate-200 animate-pulse"></div>
                ) : isEditingBaseCountries ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search active countries to set as base..."
                                    value={baseSearchQuery}
                                    onChange={(e) => setBaseSearchQuery(e.target.value)}
                                    className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setIsEditingBaseCountries(false);
                                    setBaseSearchQuery("");
                                }}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                Done Editing
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
                            {activeCountries
                                .filter(c => c.name.toLowerCase().includes(baseSearchQuery.toLowerCase()))
                                .map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => handleToggleBaseCountry(c.id)}
                                        className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                                            c.isBaseCountry 
                                                ? "bg-violet-50/60 border-violet-200 text-violet-850 font-bold" 
                                                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className={`w-4 h-4 ${c.isBaseCountry ? "text-violet-650" : "text-slate-450"}`} />
                                            <span className="text-xs truncate max-w-[120px]">{c.name}</span>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full transition-all relative ${c.isBaseCountry ? "bg-violet-600" : "bg-slate-200"}`}>
                                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.25 transition-all shadow-sm ${c.isBaseCountry ? "right-0.5" : "left-0.5"}`}></div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {activeBaseCountries.length === 0 ? (
                            <div className="col-span-full p-6 text-center border border-slate-200 bg-white rounded-2xl text-xs text-slate-500">
                                No base operating countries currently configured. Click "Edit Base Countries" to enable operating hubs.
                            </div>
                        ) : (
                            activeBaseCountries.map(bc => (
                                <div key={bc.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center gap-3">
                                    <div className="p-2.5 bg-violet-50 text-violet-650 rounded-xl border border-violet-100">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{bc.name}</h4>
                                        <div className="flex gap-1.5 mt-1 font-mono text-[9px] font-bold text-slate-400 uppercase">
                                            <span>{bc.code}</span>
                                            <span>•</span>
                                            <span>{bc.iso3}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Split Screen Zones & Creation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tax Zones list */}
                <div className="lg:col-span-2 space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Tax Zones</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Zones grouping countries for distinct tax calculation rules.</p>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl animate-pulse"></div>
                            <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl animate-pulse"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {zones.length === 0 ? (
                                <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-500">
                                    No Tax Zones configured. Create a zone in the panel to group countries.
                                </div>
                            ) : (
                                zones.map(z => {
                                    // Countries associated with this zone
                                    const mappedCountries = countries.filter(c => c.taxZoneId === z.id);

                                    return (
                                        <div key={z.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3 relative group">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                        <Map className="w-4 h-4 text-violet-600" />
                                                        {z.name}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{z.description || "No description provided."}</p>
                                                </div>
                                                {canManageTax && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => openEditZone(z)}
                                                            className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                                            title="Edit Tax Zone"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteZone(z.id)}
                                                            className="p-1.5 hover:bg-rose-50 text-slate-450 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                                            title="Delete Tax Zone"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Associated Countries ({mappedCountries.length})</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {mappedCountries.length === 0 ? (
                                                        <span className="text-[10px] text-slate-450 italic">No countries mapped. Assign them in Country Settings.</span>
                                                    ) : (
                                                        mappedCountries.map(mc => (
                                                            <span key={mc.id} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                                                <Globe className="w-2.5 h-2.5" />
                                                                {mc.name} ({mc.code})
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Create Tax Zone */}
                {canManageTax && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 font-heading">New Tax Zone</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Add a new regional tax grouping.</p>
                        </div>
                        
                        <form onSubmit={handleCreateZone} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Zone Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newZoneName}
                                    onChange={(e) => setNewZoneName(e.target.value)}
                                    placeholder="e.g. EU Tax Zone"
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Description</label>
                                <textarea
                                    value={newZoneDesc}
                                    onChange={(e) => setNewZoneDesc(e.target.value)}
                                    placeholder="e.g. Applicable VAT rates for EU member states"
                                    rows={3}
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-medium resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreatingZone}
                                className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isCreatingZone ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-3.5 h-3.5" /> Create Zone
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Tax Classes Section */}
            <div className="space-y-4 font-sans">
                <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading">Tax Classes</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tax categories available to assign to stock items and products.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tax Classes list */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading ? (
                            <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl animate-pulse"></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {taxClasses.length === 0 ? (
                                    <div className="col-span-full p-8 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-500">
                                        No Tax Classes configured. Create a tax class in the panel.
                                    </div>
                                ) : (
                                    taxClasses.map(tc => (
                                        <div key={tc.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-violet-50 text-violet-650 rounded-xl border border-violet-100 font-mono text-xs font-bold uppercase">
                                                    {tc.code}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900 leading-none">{tc.name}</h4>
                                                </div>
                                            </div>
                                            {canManageTax && (
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => openEditClass(tc)}
                                                        className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                                        title="Edit Tax Class"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClass(tc.id)}
                                                        className="p-1.5 hover:bg-rose-50 text-slate-450 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                                        title="Delete Tax Class"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Create Tax Class form */}
                    {canManageTax && (
                        <div className="space-y-4">
                            <form onSubmit={handleCreateClass} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block">Class Code</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={10}
                                        value={newClassCode}
                                        onChange={(e) => setNewClassCode(e.target.value)}
                                        placeholder="e.g. STD"
                                        className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block">Class Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        placeholder="e.g. Standard Rate"
                                        className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreatingClass || !newClassCode.trim() || !newClassName.trim()}
                                    className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isCreatingClass ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" /> Create Class
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Matrix Rule setup & table */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Tax Rates Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Determine the applicable tax percentage based on combination of Product Tax Class, Base Country (shipping from) and Delivery Country (shipping to).</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Matrix table */}
                    <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-16 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                                <span className="text-xs text-slate-550 uppercase tracking-widest font-bold">Syncing Tax Matrix...</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="py-3.5 px-6">Product Tax Class</th>
                                            <th className="py-3.5 px-6">Base Country (From)</th>
                                            <th className="py-3.5 px-6">Delivery Country (To)</th>
                                            <th className="py-3.5 px-6 text-center">Tax Rate (%)</th>
                                            <th className="py-3.5 px-6 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                        {rates.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                                                    No tax rates configured in the matrix rules. Add a rule using the creator panel.
                                                </td>
                                            </tr>
                                        ) : (
                                            rates.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50/40 text-xs">
                                                    <td className="py-4 px-6 font-bold text-slate-900">
                                                        <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-750 font-bold border border-violet-100 text-[10px]">
                                                            {r.taxClass?.code || "STD"}
                                                        </span>
                                                        <span className="text-slate-500 ml-1.5 font-medium">{r.taxClass?.name}</span>
                                                    </td>
                                                    <td className="py-4 px-6 font-semibold text-slate-700 flex items-center gap-1.5">
                                                        <Landmark className="w-3.5 h-3.5 text-slate-400" />
                                                        {r.baseCountry?.name}
                                                    </td>
                                                    <td className="py-4 px-6 font-semibold text-slate-700">
                                                        <div className="flex items-center gap-1.5">
                                                            {r.deliveryCountryId ? (
                                                                <>
                                                                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                                                                    {r.deliveryCountry?.name || `Country ID: ${r.deliveryCountryId}`}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Map className="w-3.5 h-3.5 text-violet-500" />
                                                                    <span className="text-violet-750 font-bold">Zone: {r.deliveryZone?.name || `Zone ID: ${r.deliveryZoneId}`}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-slate-900 font-mono">
                                                        {(r.rate * 100).toFixed(2)}%
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                         <div className="flex items-center justify-center gap-2">
                                                             <button
                                                                 onClick={() => openEditRate(r)}
                                                                 disabled={!canManageTax}
                                                                 className="p-1 hover:bg-slate-50 text-slate-455 hover:text-slate-700 rounded border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                                                                 title="Edit Rule"
                                                             >
                                                                 <Pencil className="w-3.5 h-3.5" />
                                                             </button>
                                                             <button
                                                                 onClick={() => handleDeleteRate(r.id)}
                                                                 disabled={!canManageTax}
                                                                 className="p-1 hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                                                                 title="Delete Rule"
                                                             >
                                                                 <Trash2 className="w-3.5 h-3.5" />
                                                             </button>
                                                         </div>
                                                     </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Create Rate Form */}
                    {canManageTax && (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 space-y-4 self-start">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                                <Percent className="w-4 h-4 text-violet-650" /> Add Matrix Rule
                            </h4>

                            <form onSubmit={handleCreateRate} className="space-y-4 text-left">
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block">Base Country (From)</label>
                                    <select
                                        value={newRateBaseId}
                                        onChange={(e) => setNewRateBaseId(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                    >
                                        {activeBaseCountries.map(bc => (
                                            <option key={bc.id} value={bc.id}>{bc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1.5">Delivery Destination Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewRateDestType("country")}
                                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                newRateDestType === "country"
                                                    ? "bg-violet-600 border-violet-600 text-white shadow-sm font-bold"
                                                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                                            }`}
                                        >
                                            Single Country
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewRateDestType("zone")}
                                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                                newRateDestType === "zone"
                                                    ? "bg-violet-600 border-violet-600 text-white shadow-sm font-bold"
                                                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                                            }`}
                                        >
                                            Tax Zone
                                        </button>
                                    </div>
                                </div>

                                {newRateDestType === "country" ? (
                                    <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Delivery Country (To)</label>
                                        <select
                                            value={newRateDeliveryId}
                                            onChange={(e) => setNewRateDeliveryId(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                        >
                                            <option value="">-- Select Country --</option>
                                            {activeCountries.map(ac => (
                                                <option key={ac.id} value={ac.id}>{ac.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Delivery Zone (To)</label>
                                        <select
                                            value={newRateZoneId}
                                            onChange={(e) => setNewRateZoneId(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                        >
                                            <option value="">-- Select Zone --</option>
                                            {zones.map(z => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block">Product Tax Class</label>
                                    <select
                                        value={newRateClassId}
                                        onChange={(e) => setNewRateClassId(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                    >
                                        {taxClasses.map(tc => (
                                            <option key={tc.id} value={tc.id}>{tc.name} ({tc.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block">Tax Rate Percentage</label>
                                    <div className="relative mt-1.5 rounded-lg shadow-sm">
                                        <input
                                            type="number"
                                            required
                                            min={0}
                                            max={100}
                                            step="0.01"
                                            placeholder="20.00"
                                            value={newRatePercent}
                                            onChange={(e) => setNewRatePercent(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-xs font-bold font-mono">%</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        isCreatingRate || 
                                        newRateBaseId === "" || 
                                        (newRateDestType === "country" ? newRateDeliveryId === "" : newRateZoneId === "") || 
                                        newRateClassId === "" || 
                                        newRatePercent === ""
                                    }
                                    className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isCreatingRate ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" /> Add Rate Rule
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Tax Zone Modal */}
            {editingZone && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Map className="w-5 h-5 text-violet-600" /> Edit Tax Zone
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Modify zone information and country assignments.</p>
                            </div>
                            <button
                                onClick={() => setEditingZone(null)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1.5 hover:bg-slate-50 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleUpdateZone} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Zone Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editZoneName}
                                    onChange={(e) => setEditZoneName(e.target.value)}
                                    placeholder="e.g. EU Tax Zone"
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Description</label>
                                <textarea
                                    value={editZoneDesc}
                                    onChange={(e) => setEditZoneDesc(e.target.value)}
                                    placeholder="e.g. Applicable VAT rates for EU member states"
                                    rows={2}
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-medium resize-none"
                                />
                            </div>

                            {/* Country selection checkboxes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Map Countries to Zone</label>
                                <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 max-h-60 overflow-y-auto grid grid-cols-2 gap-3">
                                    {activeCountries.map(c => {
                                        const isChecked = editZoneCountryIds.includes(c.id);
                                        const otherZone = c.taxZoneId && c.taxZoneId !== editingZone.id 
                                            ? zones.find(z => z.id === c.taxZoneId) 
                                            : null;
                                        
                                        return (
                                            <label 
                                                key={c.id} 
                                                className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer text-xs ${
                                                    isChecked 
                                                        ? "bg-violet-50 border-violet-200 text-violet-850 font-bold" 
                                                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50/80"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleEditZoneCountry(c.id)}
                                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-550"
                                                />
                                                <div className="truncate">
                                                    <span className="block truncate">{c.name} ({c.code})</span>
                                                    {otherZone && (
                                                        <span className="block text-[8px] text-amber-600 font-semibold uppercase mt-0.5">
                                                            Moves from {otherZone.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingZone(null)}
                                    className="py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingZone || !editZoneName.trim()}
                                    className="py-2 px-5 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingZone ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>Save Changes</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Tax Rate Modal */}
            {editingRate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-violet-600" /> Edit Matrix Rule
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Modify combination settings and tax rate percentage.</p>
                            </div>
                            <button
                                onClick={() => setEditingRate(null)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1.5 hover:bg-slate-50 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleUpdateRate} className="p-6 space-y-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 block">Base Country (From)</label>
                                <select
                                    value={editRateBaseId}
                                    onChange={(e) => setEditRateBaseId(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                >
                                    {activeBaseCountries.map(bc => (
                                        <option key={bc.id} value={bc.id}>{bc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1.5">Delivery Destination Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditRateDestType("country")}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                            editRateDestType === "country"
                                                ? "bg-violet-600 border-violet-600 text-white shadow-sm font-bold"
                                                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                                        }`}
                                    >
                                        Single Country
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditRateDestType("zone")}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                            editRateDestType === "zone"
                                                ? "bg-violet-600 border-violet-600 text-white shadow-sm font-bold"
                                                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                                        }`}
                                    >
                                        Tax Zone
                                    </button>
                                </div>
                            </div>

                            {editRateDestType === "country" ? (
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block">Delivery Country (To)</label>
                                    <select
                                        value={editRateDeliveryId}
                                        onChange={(e) => setEditRateDeliveryId(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                    >
                                        <option value="">-- Select Country --</option>
                                        {activeCountries.map(ac => (
                                            <option key={ac.id} value={ac.id}>{ac.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 block">Delivery Zone (To)</label>
                                    <select
                                        value={editRateZoneId}
                                        onChange={(e) => setEditRateZoneId(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                    >
                                        <option value="">-- Select Zone --</option>
                                        {zones.map(z => (
                                            <option key={z.id} value={z.id}>{z.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 block">Product Tax Class</label>
                                <select
                                    value={editRateClassId}
                                    onChange={(e) => setEditRateClassId(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full mt-1.5 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold cursor-pointer"
                                >
                                    {taxClasses.map(tc => (
                                        <option key={tc.id} value={tc.id}>{tc.name} ({tc.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 block">Tax Rate Percentage</label>
                                <div className="relative mt-1.5 rounded-lg shadow-sm">
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        placeholder="20.00"
                                        value={editRatePercent}
                                        onChange={(e) => setEditRatePercent(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850 font-semibold"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 text-xs font-bold font-mono">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingRate(null)}
                                    className="py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSavingRate || 
                                        editRateBaseId === "" || 
                                        (editRateDestType === "country" ? editRateDeliveryId === "" : editRateZoneId === "") || 
                                        editRateClassId === "" || 
                                        editRatePercent === ""
                                    }
                                    className="py-2 px-5 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingRate ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>Save Changes</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Tax Class Modal */}
            {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                                    <Percent className="w-5 h-5 text-violet-600" /> Edit Tax Class
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Modify tax class code and name details.</p>
                            </div>
                            <button
                                onClick={() => setEditingClass(null)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1.5 hover:bg-slate-50 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleUpdateClass} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Class Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={10}
                                    value={editClassCode}
                                    onChange={(e) => setEditClassCode(e.target.value)}
                                    placeholder="e.g. STD"
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Class Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editClassName}
                                    onChange={(e) => setEditClassName(e.target.value)}
                                    placeholder="e.g. Standard Rate"
                                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingClass(null)}
                                    className="py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingClass || !editClassCode.trim() || !editClassName.trim()}
                                    className="py-2 px-5 bg-violet-600 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-550/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingClass ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>Save Changes</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 text-center space-y-4">
                            <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-slate-900 font-heading">{confirmModal.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="py-2 px-4.5 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-550/10 transition-all cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
