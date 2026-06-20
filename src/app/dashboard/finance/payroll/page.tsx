"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Users, Banknote, CalendarDays, Plus, Play, CheckCircle } from "lucide-react";

export default function PayrollPage() {
  const { token, user, activeLanguage } = useApp();

  const [employees, setEmployees] = useState<any[]>([]);
  const [payRuns, setPayRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [niNumber, setNiNumber] = useState("");
  const [salary, setSalary] = useState(3000.0);

  const [showRunModal, setShowRunModal] = useState(false);
  const [start, setStart] = useState("2026-06-01");
  const [end, setEnd] = useState("2026-06-30");

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchPayrollData();
  }, [token]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const empRes = await axios.get("http://localhost:5000/api/finance/payroll/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(empRes.data);

      const runsRes = await axios.get("http://localhost:5000/api/finance/payroll/runs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayRuns(runsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/finance/payroll/employees", {
        firstName,
        lastName,
        nationalInsuranceNumber: niNumber,
        taxCode: "1257L",
        monthlySalary: Number(salary)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEmpModal(false);
      setFirstName("");
      setLastName("");
      setNiNumber("");
      fetchPayrollData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create employee.");
    }
  };

  const handleCreatePayRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/finance/payroll/runs", {
        periodStart: new Date(start).toISOString(),
        periodEnd: new Date(end).toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowRunModal(false);
      fetchPayrollData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create payrun.");
    }
  };

  const handleProcessPayRun = async (id: string) => {
    setProcessingId(id);
    try {
      await axios.post(`http://localhost:5000/api/finance/payroll/runs/${id}/process`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPayrollData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to process payrun.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(activeLanguage, {
      style: "currency",
      currency: "GBP"
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest font-heading">Finance</span>
          <h2 className="text-3xl font-bold font-heading text-slate-100">Payroll Cycles</h2>
          <p className="text-slate-400 text-sm mt-1">Manage corporate employees and calculate income tax deductions on wage payments.</p>
        </div>
        
        {(user?.role === "CompanyAdmin" || user?.role === "Accounts" || user?.role === "GlobalAdmin") && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowEmpModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold border border-slate-800 hover:border-slate-700 text-slate-300 text-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95"
            >
              <CalendarDays className="w-4 h-4" /> Schedule Pay Run
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Employees Panel */}
        <div className="md:col-span-1 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Employees Registry
          </h3>

          <div className="space-y-3">
            {employees.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No employees registered.</div>
            ) : (
              employees.map(emp => (
                <div key={emp.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-200">{emp.firstName} {emp.lastName}</strong>
                    <span className="text-[10px] text-slate-500 font-semibold">{emp.taxCode}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>NI: {emp.nationalInsuranceNumber}</span>
                    <span className="font-bold text-cyan-400">{formatMoney(emp.monthlySalary)}/mo</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pay Runs Panel */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-violet-400" />
            Monthly Wages Runs
          </h3>

          <div className="space-y-4">
            {payRuns.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-6">No pay runs generated.</div>
            ) : (
              payRuns.map(run => (
                <div key={run.id} className="p-4 bg-slate-950/85 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        Period: {new Date(run.periodStart).toLocaleDateString()} to {new Date(run.periodEnd).toLocaleDateString()}
                      </span>
                      {run.processedDate && (
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Processed on: {new Date(run.processedDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    {run.status === 0 ? ( // Draft
                      <button
                        onClick={() => handleProcessPayRun(run.id)}
                        disabled={processingId === run.id}
                        className="py-1.5 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[10px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" /> Process Pay Run
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-900/40 uppercase">
                        <CheckCircle className="w-3 h-3" /> Processed & GL Posted
                      </span>
                    )}
                  </div>

                  {/* Slips Details */}
                  {run.paySlips && run.paySlips.length > 0 && (
                    <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-950 space-y-1.5">
                      {run.paySlips.map((slip: any) => (
                        <div key={slip.id} className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span className="w-1/4 truncate text-slate-300">{slip.employee?.firstName} {slip.employee?.lastName}</span>
                          <span className="w-1/4 text-right">Gross: {formatMoney(slip.grossPay)}</span>
                          <span className="w-1/4 text-right text-rose-500">Tax/NI: -{formatMoney(slip.taxDeduction + slip.nationalInsuranceDeduction)}</span>
                          <span className="w-1/4 text-right text-emerald-400 font-bold">Net: {formatMoney(slip.netPay)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-100">Register Employee</h3>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="David"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Miller"
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">National Insurance Number</label>
                <input
                  type="text"
                  required
                  value={niNumber}
                  onChange={(e) => setNiNumber(e.target.value)}
                  placeholder="JW987654A"
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Monthly Salary (£)</label>
                <input
                  type="number"
                  required
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-violet-500 text-slate-200"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                >
                  Create Employee Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PayRun Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-100">Schedule Pay Run Period</h3>
            <form onSubmit={handleCreatePayRun} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Start Date</label>
                  <input
                    type="date"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">End Date</label>
                  <input
                    type="date"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                >
                  Initialize Payrun Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
