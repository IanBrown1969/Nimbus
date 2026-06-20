"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

interface CompletePickModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  pickList: any;
  onSuccess: () => void;
  getTranslatedName: (nameJsonStr: string) => string;
}

export default function CompletePickModal({
  isOpen,
  onClose,
  token,
  pickList,
  onSuccess,
  getTranslatedName,
}: CompletePickModalProps) {
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [submittingPick, setSubmittingPick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pickList) {
      const initialQtys: Record<string, number> = {};
      pickList.lines.forEach((line: any) => {
        initialQtys[line.id] = line.quantityToPick;
      });
      setPickedQuantities(initialQtys);
    }
  }, [isOpen, pickList]);

  if (!isOpen || !pickList) return null;

  const handleCompletePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPick(true);
    setError(null);
    try {
      const payload = {
        lines: pickList.lines.map((line: any) => ({
          lineId: line.id,
          quantityPicked: Number(pickedQuantities[line.id] || 0),
          binLocationId: line.binLocationId
        }))
      };

      await axios.post(`http://localhost:5000/api/warehouse/pick-lists/${pickList.id}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete picking sheet.");
    } finally {
      setSubmittingPick(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900">Resolve Picking Sheet: {pickList.pickListNumber}</h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCompletePick} className="space-y-4">
          <p className="text-xs text-slate-500">Verify picked quantities from target bin locations:</p>

          <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-[30vh] overflow-y-auto">
            {pickList.lines.map((line: any) => (
              <div key={line.id} className="space-y-2 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{line.stockItem?.sku} - {getTranslatedName(line.stockItem?.nameJson || line.stockItem?.name)}</span>
                  <span className="text-[10px] text-slate-500">Target Bin: <strong className="font-mono text-cyan-700">{line.binLocation?.code || "Default"}</strong></span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-500">Expected to pick: {line.quantityToPick} units</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Picked:</span>
                    <input
                      type="number"
                      required
                      value={pickedQuantities[line.id] !== undefined ? pickedQuantities[line.id] : 0}
                      onChange={(e) => {
                        const newQtys = { ...pickedQuantities };
                        newQtys[line.id] = Number(e.target.value);
                        setPickedQuantities(newQtys);
                      }}
                      className="w-16 text-center text-xs py-1 bg-slate-55 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPick}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Complete Worksheet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
