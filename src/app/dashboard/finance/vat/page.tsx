"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Scale, FileText, CheckCircle, Percent, AlertCircle } from "lucide-react";

export default function VatPage() {
  const { token, activeLanguage } = useApp();

  const [returnsHistory, setReturnsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Range
  const [start, setStart] = useState("2026-04-01");
  const [end, setEnd] = useState("2026-06-30");

  // Dynamic boxes calculations
  const [boxData, setBoxData] = useState<any | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (token) {
      fetchVatHistory();
    }
  }, [token]);

  const fetchVatHistory = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/finance/vat/returns", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturnsHistory(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError(null);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/finance/vat/calculate?start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBoxData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to calculate VAT Return.");
    } finally {
      setCalculating(false);
    }
  };

  const handleFileReturn = async () => {
    if (!boxData) return;
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5000/api/finance/vat/returns",
        {
          periodStart: boxData.periodStart,
          periodEnd: boxData.periodEnd,
          box1: boxData.box1,
          box2: boxData.box2,
          box4: boxData.box4,
          box6: boxData.box6,
          box7: boxData.box7,
          box8: boxData.box8,
          box9: boxData.box9
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBoxData(null);
      fetchVatHistory();
      alert("HMRC VAT Return filed and finalized successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to file VAT Return.");
    } finally {
      setLoading(false);
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
      <div>
        <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Finance</span>
        <h2 className="text-3xl font-bold font-heading text-slate-900">UK VAT Returns</h2>
        <p className="text-slate-655 text-sm mt-1">Submit quarterly HMRC returns using live double-entry ledger calculations.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Box Calculation Console */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Percent className="w-5 h-5 text-violet-600" />
            HMRC VAT Return Calculator (Quarterly)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Period Start</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Period End</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            {calculating ? "Calculating boxes from ledger..." : "Compute Box 1-9 Summaries"}
          </button>

          {/* Dynamic Boxes output */}
          {boxData && (
            <div className="pt-4 border-t border-slate-200 space-y-4 font-mono text-xs">
              <h4 className="font-sans font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Scale className="w-4 h-4 text-cyan-600" /> Calculated HMRC return sheet:
              </h4>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Box 1: VAT due on sales & outputs</span>
                  <strong className="text-slate-800">{formatMoney(boxData.box1)}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Box 2: VAT due on EC acquisitions</span>
                  <strong className="text-slate-800">{formatMoney(boxData.box2)}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 text-violet-750">
                  <span>Box 3: Total VAT due (Box 1 + 2)</span>
                  <strong className="font-bold">{formatMoney(boxData.box3)}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Box 4: VAT reclaimed on purchases</span>
                  <strong className="text-slate-800">{formatMoney(boxData.box4)}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 text-emerald-700">
                  <span>Box 5: Net VAT Pay/Reclaim</span>
                  <strong className="font-bold">{formatMoney(boxData.box5)}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Box 6: Total Net Sales (ex VAT)</span>
                  <strong className="text-slate-800">{formatMoney(boxData.box6)}</strong>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-500">Box 7: Total Net Purchases (ex VAT)</span>
                  <strong className="text-slate-800">{formatMoney(boxData.box7)}</strong>
                </div>
              </div>

              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0" />
                <p className="text-[10px] text-slate-655 font-sans leading-relaxed">
                  Verify these calculations. Submitting this return files records to HMRC under the Making Tax Digital (MTD) mandate.
                </p>
              </div>

              <button
                onClick={handleFileReturn}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition-colors"
              >
                {loading ? "Submitting..." : "Submit VAT Return to HMRC"}
              </button>
            </div>
          )}
        </div>

        {/* VAT History */}
        <div className="md:col-span-1 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Filed History
          </h3>

          <div className="space-y-3">
            {returnsHistory.length === 0 ? (
              <div className="text-slate-500 text-xs italic text-center py-6">No historical filings recorded.</div>
            ) : (
              returnsHistory.map(item => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">
                      Q Ending {new Date(item.periodEnd).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded uppercase">
                      <CheckCircle className="w-2.5 h-2.5" /> Filed
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                    <span>Liability Pay:</span>
                    <span className="font-bold text-rose-650">{formatMoney(item.box5)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
