"use client";

import React, { useState } from "react";
import axios from "axios";
import { MapPin } from "lucide-react";

interface CreateBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
}

export default function CreateBinModal({
  isOpen,
  onClose,
  token,
  onSuccess,
}: CreateBinModalProps) {
  const [binCode, setBinCode] = useState("");
  const [binDesc, setBinDesc] = useState("");
  const [submittingBin, setSubmittingBin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBin(true);
    setError(null);
    try {
      await axios.post("http://localhost:5000/api/warehouse/bins", {
        code: binCode,
        description: binDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBinCode("");
      setBinDesc("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create bin location.");
    } finally {
      setSubmittingBin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-600" /> Create Bin Location
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAddBin} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Bin Location Code</label>
            <input
              type="text"
              required
              value={binCode}
              onChange={(e) => setBinCode(e.target.value)}
              placeholder="C-02-04"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
            <input
              type="text"
              required
              value={binDesc}
              onChange={(e) => setBinDesc(e.target.value)}
              placeholder="Aisle C, Rack 2, Shelf 4"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBin}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Create Bin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
