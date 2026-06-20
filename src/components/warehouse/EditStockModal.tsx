"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calculator } from "lucide-react";

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  item: any;
  isPimActive: boolean;
  onSuccess: () => void;
}

export default function EditStockModal({
  isOpen,
  onClose,
  token,
  item,
  isPimActive,
  onSuccess,
}: EditStockModalProps) {
  const [sku, setSku] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [stockUnit, setStockUnit] = useState("Pallet");
  const [sellUnit, setSellUnit] = useState("Each");
  const [ratio, setRatio] = useState(100.0);
  const [price, setPrice] = useState(150.0);
  const [enableForWebsite, setEnableForWebsite] = useState(true);
  const [submittingStock, setSubmittingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setSku(item.sku || "");
      setStockUnit(item.stockUnitOfSale || "Pallet");
      setSellUnit(item.sellUnitOfSale || "Each");
      setRatio(item.conversionRatio || 100.0);
      setPrice(item.basePrice || 150.0);
      setEnableForWebsite(item.enableForWebsite ?? true);

      // Name translations
      try {
        const names = typeof item.name === "string" ? JSON.parse(item.name) : item.name;
        setNameEn(names?.["en-GB"] || "");
        setNameFr(names?.["fr-FR"] || "");
      } catch {
        setNameEn(item.name || "");
        setNameFr("");
      }

      // Description translations
      try {
        const descs = typeof item.description === "string" ? JSON.parse(item.description) : item.description;
        setDescEn(descs?.["en-GB"] || "");
      } catch {
        setDescEn(item.description || "");
      }
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleEditStockItem = async (e: React.FormEvent) => {
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
        enableForWebsite: enableForWebsite,
        richDescriptionJson: isPimActive ? JSON.stringify({ "en-GB": `<p>${descEn}</p>` }) : "{}",
        mediaUrlsJson: isPimActive ? (item.mediaUrls || "[]") : "[]",
        specificationsJson: isPimActive ? (item.specifications || "{}") : "{}"
      };

      // The backend update stock endpoint is POST /api/warehouse/stock/{id}
      await axios.post(`http://localhost:5000/api/warehouse/stock/${item.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update stock item.");
    } finally {
      setSubmittingStock(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5 text-slate-800">
        <h3 className="text-base font-bold text-slate-900">Edit SKU Item: {sku}</h3>
        
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleEditStockItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">SKU Code</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="BRK-BLUE-02"
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Base Price ({stockUnit} Unit)</label>
              <input
                type="number"
                step="0.0001"
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
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-55 border border-emerald-205 focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800"
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
                required
                value={stockUnit}
                onChange={(e) => setStockUnit(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Selling Unit</label>
              <input
                type="text"
                required
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
                required
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
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingStock}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
