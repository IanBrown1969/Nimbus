"use client";

import React from "react";
import { Boxes, ArrowRight } from "lucide-react";
import GoldenArrow from "@/components/common/GoldenArrow";

interface WarehouseQuantity {
  warehouseId: number;
  warehouseCode: string;
  quantity: number;
  sellingQuantity: number;
}

interface StockItem {
  id: number;
  sku: string;
  name: string;
  stockUnitOfSale: string;
  sellUnitOfSale: string;
  conversionRatio: number;
  stockingQuantity: number;
  sellingQuantity: number;
  warehouseQuantities: WarehouseQuantity[];
}

interface StockLevelsTabProps {
  stock: StockItem[];
  loading: boolean;
  activeLanguage: string;
  getTranslatedName: (nameJsonStr: string) => string;
}

export default function StockLevelsTab({
  stock,
  loading,
  getTranslatedName,
}: StockLevelsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Boxes className="w-5 h-5 text-violet-600" />
        Stock Item Inventory Levels
      </h3>

      {loading ? (
        <div className="text-slate-500 text-xs text-center py-6">Loading inventory levels...</div>
      ) : stock.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No inventory items defined yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Unit Ratio</th>
                <th className="py-3 px-4 text-right">Stocking Qty</th>
                <th className="py-3 px-4 text-right">Available Selling Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {stock.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 text-slate-700">
                  <td className="py-3 px-4 font-mono font-bold text-violet-650 flex items-center gap-1.5">
                    <span>{item.sku}</span>
                    <GoldenArrow type="item" id={item.sku} />
                  </td>
                  <td className="py-3 px-4 font-medium">{getTranslatedName(item.name)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-500">
                      1 {item.stockUnitOfSale}
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      {item.conversionRatio} {item.sellUnitOfSale}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    <div>{item.stockingQuantity} <span className="text-[10px] text-slate-400">{item.stockUnitOfSale}</span></div>
                    {item.warehouseQuantities && item.warehouseQuantities.length > 0 && (
                      <div className="text-[9px] text-slate-450 font-normal mt-1 space-y-0.5">
                        {item.warehouseQuantities.map((wh) => (
                          <div key={wh.warehouseId} className="flex justify-end gap-1">
                            <span>{wh.warehouseCode}:</span>
                            <span className="font-semibold text-slate-600">{wh.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-cyan-700">
                    <div>{item.sellingQuantity} <span className="text-[10px] text-slate-400">{item.sellUnitOfSale}</span></div>
                    {item.warehouseQuantities && item.warehouseQuantities.length > 0 && (
                      <div className="text-[9px] text-slate-450 font-normal mt-1 space-y-0.5">
                        {item.warehouseQuantities.map((wh) => (
                          <div key={wh.warehouseId} className="flex justify-end gap-1">
                            <span>{wh.warehouseCode}:</span>
                            <span className="font-semibold text-cyan-600">{wh.sellingQuantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
