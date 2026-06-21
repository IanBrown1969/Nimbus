"use client";

import React, { useState } from "react";
import { 
  Award, 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  BookOpen, 
  DollarSign, 
  RefreshCw,
  FolderLock
} from "lucide-react";

interface Grant {
  id: string;
  name: string;
  donor: string;
  totalBudget: number;
  allocatedBudget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "audited";
  complianceScore: number;
}

export default function GrantManagementPage() {
  const [grants, setGrants] = useState<Grant[]>([
    { id: "GR-028", name: "Innovate UK CleanTech R&D", donor: "Innovate UK", totalBudget: 250000, allocatedBudget: 200000, spent: 145000, startDate: "2026-01-01", endDate: "2026-12-31", status: "active", complianceScore: 98 },
    { id: "GR-027", name: "EU Horizon NetZero Pipeline", donor: "European Commission", totalBudget: 750000, allocatedBudget: 600000, spent: 320000, startDate: "2025-06-01", endDate: "2027-05-31", status: "active", complianceScore: 94 },
    { id: "GR-026", name: "Local Green Logistics Subvention", donor: "Greater London Authority", totalBudget: 50000, allocatedBudget: 50000, spent: 50000, startDate: "2025-01-01", endDate: "2025-12-31", status: "completed", complianceScore: 100 },
    { id: "GR-025", name: "Innovate UK AI Acceleration", donor: "Innovate UK", totalBudget: 120000, allocatedBudget: 120000, spent: 120000, startDate: "2024-03-01", endDate: "2025-02-28", status: "audited", complianceScore: 97 }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGrantName, setNewGrantName] = useState("");
  const [newDonor, setNewDonor] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const handleCreateGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrantName.trim() || !newDonor.trim() || !newBudget.trim()) return;

    const budgetVal = parseFloat(newBudget);
    const newGrant: Grant = {
      id: `GR-0${grants.length + 25}`,
      name: newGrantName.trim(),
      donor: newDonor.trim(),
      totalBudget: budgetVal,
      allocatedBudget: budgetVal * 0.8,
      spent: 0,
      startDate: newStartDate || new Date().toISOString().split('T')[0],
      endDate: newEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active",
      complianceScore: 100
    };

    setGrants(prev => [newGrant, ...prev]);
    
    // reset form
    setNewGrantName("");
    setNewDonor("");
    setNewBudget("");
    setNewStartDate("");
    setNewEndDate("");
    setShowAddForm(false);
  };

  const filteredGrants = grants.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.donor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPortfolio = grants.reduce((sum, g) => sum + g.totalBudget, 0);
  const totalSpent = grants.reduce((sum, g) => sum + g.spent, 0);
  const avgCompliance = Math.round(grants.reduce((sum, g) => sum + g.complianceScore, 0) / grants.length);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Grants & Funding</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Grant Funding Tracker</h2>
          <p className="text-slate-655 text-sm mt-1">Manage public/private grants, trace funding utilisation rules, and log compliance checkpoints.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-violet-500/10"
          >
            <Plus className="w-4 h-4" /> Add Funding Program
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grant Portfolio Value</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£{(totalPortfolio / 1000).toFixed(0)}k</span>
            <span className="block text-[10px] text-slate-500 mt-1">Across {grants.length} active programs</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Disbursed Capital</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£{(totalSpent / 1000).toFixed(0)}k</span>
            <span className="block text-[10px] text-slate-500 mt-1">{((totalSpent / totalPortfolio) * 100).toFixed(1)}% portfolio draw</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Audit Score</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">{avgCompliance}%</span>
            <span className="block text-[10px] text-emerald-600 font-semibold mt-1">All audit items signed off</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated Pipeline Balance</span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-800">£{((totalPortfolio - totalSpent) / 1000).toFixed(0)}k</span>
            <span className="block text-[10px] text-amber-600 font-semibold mt-1">£35k remaining allocation limit</span>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Grants Portfolio Grid (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Funding Catalog</h3>
                <p className="text-xs text-slate-505 mt-0.5">List of government funding and innovation development grants tracked in ledger.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Filter grants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-violet-500 text-slate-850"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-150">
              {filteredGrants.map((g) => {
                const percentSpent = ((g.spent / g.totalBudget) * 100).toFixed(0);
                return (
                  <div key={g.id} className="py-5 flex flex-col md:flex-row justify-between gap-4 transition-all hover:bg-slate-50/50 rounded-xl px-2">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-violet-50 border border-violet-100 text-violet-650 rounded-xl shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-850 flex items-center gap-2">
                            {g.name}
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded uppercase tracking-wider">{g.id}</span>
                          </h4>
                          <span className="text-[10px] text-slate-500 block mt-1">Donor: <strong className="text-slate-700 font-semibold">{g.donor}</strong></span>
                        </div>
                      </div>

                      {/* Progress utilisation bar */}
                      <div className="pl-10 space-y-1 max-w-md">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                          <span>Utilisation: £{g.spent.toLocaleString()} / £{g.totalBudget.toLocaleString()}</span>
                          <span className="text-slate-655">{percentSpent}% spent</span>
                        </div>
                        <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500 to-indigo-650 h-full rounded-full transition-all duration-300" style={{ width: `${percentSpent}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:text-right">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                        g.status === "active" 
                          ? "bg-sky-50 border border-sky-200 text-sky-700" 
                          : g.status === "completed" 
                          ? "bg-emerald-50 border border-emerald-250 text-emerald-700" 
                          : "bg-purple-50 border border-purple-250 text-purple-700"
                      }`}>
                        {g.status}
                      </span>
                      <div className="text-[10px] text-slate-450 mt-1">
                        Compliance Index: <strong className="text-emerald-700 font-bold">{g.complianceScore}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Compliance checklist Column (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Grant Compliance Audits</h3>
              <p className="text-[11px] text-slate-505">Track matching requirements and post audit checklists.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block font-bold text-slate-800">Capital Isolation Rules</span>
                  <span className="block text-slate-500 mt-1">Separate ledger accounts verified. No mixing with operational cash.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block font-bold text-slate-800">COGS Expenditure Audit</span>
                  <span className="block text-slate-500 mt-1">Receipt attachment verification matches Innovate UK R&D rules.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <FolderLock className="w-4.5 h-4.5 text-violet-650 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block font-bold text-slate-800">Time-Tracking Log Locks</span>
                  <span className="block text-slate-500 mt-1">Timesheets locked to prevent retro-adjustments to EU Horizon claims.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add Funding Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-violet-650" />
                Add New Funding Program
              </h3>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGrant} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Funding Program Name</label>
                <input 
                  type="text" 
                  required
                  value={newGrantName}
                  onChange={(e) => setNewGrantName(e.target.value)}
                  placeholder="e.g. Innovate UK NetZero Mobility" 
                  className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Funding Donor Entity</label>
                  <input 
                    type="text" 
                    required
                    value={newDonor}
                    onChange={(e) => setNewDonor(e.target.value)}
                    placeholder="e.g. Innovate UK" 
                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Total Grant Capital (£)</label>
                  <input 
                    type="number" 
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. 150000" 
                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Start Date</label>
                  <input 
                    type="date" 
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">End Date</label>
                  <input 
                    type="date" 
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full mt-1.5 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
