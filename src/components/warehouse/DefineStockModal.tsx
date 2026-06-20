"use client";

import React, { useState } from "react";
import axios from "axios";
import { Calculator } from "lucide-react";

interface DefineStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  isPimActive: boolean;
  onSuccess: () => void;
}

export default function DefineStockModal({
  isOpen,
  onClose,
  token,
  isPimActive,
  onSuccess,
}: DefineStockModalProps) {
  const [sku, setSku] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [stockUnit, setStockUnit] = useState("Pallet");
  const [sellUnit, setSellUnit] = useState("Each");
  const [ratio, setRatio] = useState(100.0);
  const [price, setPrice] = useState(150.0);
  const [submittingStock, setSubmittingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStock(true);
    setError(null);
    try {
      const payload = {
        sku,
        nameJson: JSON.stringify({ "en-GB": nameEn, "fr-FR": nameFr }),
        descriptionJson: JSON.stringify({ "en-GB": descEn }),
        stockUnitOfSale: stockUnit,
        sellUnitOfSale: sellUnit,
        conversionRatio: Number(ratio),
        basePrice: Number(price),
        enableForWebsite: true,
        richDescriptionJson: isPimActive ? JSON.stringify({ "en-GB": `<p>${descEn}</p>` }) : "{}",
        mediaUrlsJson: isPimActive ? "[\"https://images.unsplash.com/photo-1590069261209-f8e9b8642343\"]" : "[]",
        specificationsJson: isPimActive ? JSON.stringify({ "weight": "2kg" }) : "{}"
      };

      await axios.post("http://localhost:5000/api/warehouse/stock", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSku("");
      setNameEn("");
      setNameFr("");
      setDescEn("");
      setRatio(100);
      setPrice(150);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create stock item.");
    } finally {
      setSubmittingStock(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5">
        <h3 className="text-base font-bold text-slate-900">Define New SKU Item</h3>
        
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAddStockItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">SKU Code</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="BRK-BLUE-02"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Pallet Base Price (£)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">English Name</label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Blue Brick Pallet"
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
            />
          </div>

          {isPimActive && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 text-emerald-600">French Translation Name (PIM Enabled)</label>
              <input
                type="text"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder="Palette de briques bleues"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-55 border border-emerald-200 focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Clay brick details..."
              className="w-full mt-1 text-xs px-3 py-2 bg-slate-55 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Stock Unit</label>
              <input
                type="text"
                value={stockUnit}
                onChange={(e) => setStockUnit(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Selling Unit</label>
              <input
                type="text"
                value={sellUnit}
                onChange={(e) => setSellUnit(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-0.5">
                Ratio <Calculator className="w-3 h-3 text-slate-400" />
              </label>
              <input
                type="number"
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingStock}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Create SKU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
