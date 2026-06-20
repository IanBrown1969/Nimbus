"use client";

import React from "react";
import { MapPin, Lock } from "lucide-react";

interface BinLocation {
  id: number;
  code: string;
  description: string;
}

interface BinLocationsTabProps {
  bins: BinLocation[];
  loading: boolean;
  isWmsActive: boolean;
}

export default function BinLocationsTab({ bins, loading, isWmsActive }: BinLocationsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-cyan-600" />
        Warehouse Bins Layout
      </h3>

      {!isWmsActive ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700">Advanced WMS locked</h4>
          <p className="text-[10px] text-slate-500">Subscribe to WMS package inside settings to unlock bin tracking features.</p>
        </div>
      ) : loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading bins...</div>
      ) : bins.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No bin locations defined.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bins.map((bin) => (
            <div key={bin.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="block text-xs font-mono font-bold text-cyan-700">{bin.code}</span>
              <span className="block text-[10px] text-slate-650">{bin.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
