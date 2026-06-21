"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Globe, Search, RefreshCw, Landmark, ShieldCheck, ToggleLeft, ToggleRight, Check, X, ShieldAlert, Loader2 } from "lucide-react";

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
}

export default function CountriesSettingsPage() {
    const { token, user } = useApp();
    const [countries, setCountries] = useState<Country[]>([]);
    const [taxZones, setTaxZones] = useState<TaxZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const isAdmin = user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin";

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [countriesRes, zonesRes] = await Promise.all([
                axios.get("http://localhost:5000/api/countries/all", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("http://localhost:5000/api/finance/tax/zones", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setCountries(countriesRes.data);
            setTaxZones(zonesRes.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to load countries and tax settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id: number) => {
        if (!isAdmin) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/countries/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCountries(countries.map(c => c.id === id ? { ...c, isActive: res.data.country.isActive } : c));
            showSuccess(res.data.message);
        } catch (err: any) {
            setError("Failed to toggle country active status.");
        }
    };

    const handleToggleBase = async (id: number) => {
        if (!isAdmin) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/countries/${id}/toggle-base`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCountries(countries.map(c => c.id === id ? { ...c, isBaseCountry: res.data.country.isBaseCountry } : c));
            showSuccess(res.data.message);
        } catch (err: any) {
            setError("Failed to toggle base country status.");
        }
    };

    const handleZoneChange = async (countryId: number, zoneIdVal: string) => {
        if (!isAdmin) return;
        const parsedZoneId = zoneIdVal === "" ? null : Number(zoneIdVal);
        try {
            const res = await axios.post(`http://localhost:5000/api/countries/${countryId}/zone`, {
                taxZoneId: parsedZoneId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const matchedZone = taxZones.find(z => z.id === parsedZoneId);
            setCountries(countries.map(c => c.id === countryId ? { 
                ...c, 
                taxZoneId: parsedZoneId,
                taxZone: matchedZone ? { id: matchedZone.id, name: matchedZone.name } : undefined
            } : c));
            showSuccess(res.data.message);
        } catch (err: any) {
            setError("Failed to update country tax zone association.");
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => {
            setSuccessMsg(null);
        }, 3000);
    };

    const filteredCountries = countries.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.iso3.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Settings</span>
                    <h2 className="text-3xl font-bold font-heading text-slate-900">Country Management</h2>
                    <p className="text-slate-660 text-sm mt-1">Configure global lookup countries. Enable or disable countries for checkout processes, establish base company operating hubs, and map countries to Tax Zones.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold self-start cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Error & Success Messages */}
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

            {/* Permissions Alert */}
            {!isAdmin && (
                <div className="p-4 bg-amber-50 border border-amber-250 text-amber-800 text-xs flex items-center gap-3 rounded-2xl">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <span>You do not have administration rights. Only Company/Global Administrators can change base countries, zones, and toggle status.</span>
                </div>
            )}

            {/* Control Bar & Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search by country name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-medium"
                        />
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">
                        Showing {filteredCountries.length} of {countries.length} Countries
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Syncing Country Registry...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Country Name</th>
                                    <th className="py-3.5 px-6 text-center">ISO 2 (Alpha-2)</th>
                                    <th className="py-3.5 px-6 text-center">ISO 3 (Alpha-3)</th>
                                    <th className="py-3.5 px-6 text-center">Active Lookup</th>
                                    <th className="py-3.5 px-6 text-center">Base Operating hub</th>
                                    <th className="py-3.5 px-6">Tax Zone Mapping</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                                {filteredCountries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-xs text-slate-550">
                                            No matching countries found in the lookup dictionary.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCountries.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/40 text-xs transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                                                <Globe className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                                {c.name}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-700 uppercase">
                                                    {c.code}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="px-2 py-1 rounded bg-violet-50 border border-violet-100 font-mono text-[10px] font-bold text-violet-750 uppercase">
                                                    {c.iso3}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(c.id)}
                                                    disabled={!isAdmin}
                                                    className="inline-flex cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all"
                                                >
                                                    {c.isActive ? (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wide">Enabled</span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-500 uppercase tracking-wide">Disabled</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleBase(c.id)}
                                                    disabled={!isAdmin || !c.isActive}
                                                    className="inline-flex cursor-pointer disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
                                                    title={!c.isActive ? "Country must be active to designate as base" : "Toggle Base Country"}
                                                >
                                                    {c.isBaseCountry ? (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 border border-violet-200 text-violet-750 uppercase tracking-wide flex items-center gap-1">
                                                            <Landmark className="w-3 h-3 text-violet-600" /> Yes
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-500 uppercase tracking-wide">No</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6">
                                                <select
                                                    value={c.taxZoneId || ""}
                                                    disabled={!isAdmin || !c.isActive}
                                                    onChange={(e) => handleZoneChange(c.id, e.target.value)}
                                                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-semibold cursor-pointer disabled:opacity-40"
                                                >
                                                    <option value="">-- No Zone Assigned --</option>
                                                    {taxZones.map(z => (
                                                        <option key={z.id} value={z.id}>{z.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
