"use client";

import React from "react";
import { ShoppingBag, Lock, Users, Coins } from "lucide-react";

interface SupplierProcurementProps {
  isSupActive: boolean;
  suppliers: any[];
  purchaseOrders: any[];
}

export default function SupplierProcurement({
  isSupActive,
  suppliers,
  purchaseOrders,
}: SupplierProcurementProps) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Supplier Procurement (SUP Plugin)
          </span>
          {!isSupActive && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 border border-rose-250 text-rose-600 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Locked Add-on
            </span>
          )}
        </h3>

        {isSupActive ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suppliers List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-600" /> Suppliers Directory
              </h4>
              {suppliers.length === 0 ? (
                <div className="text-slate-500 text-xs italic">No suppliers defined.</div>
              ) : (
                suppliers.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
                    <div>
                      <strong className="block text-slate-800">{s.name}</strong>
                      <span className="block text-slate-550 text-[10px] mt-0.5">{s.email}</span>
                    </div>
                    <span className="text-[10px] text-slate-550 uppercase tracking-widest">{s.defaultCurrencyCode}</span>
                  </div>
                ))
              )}
            </div>

            {/* Purchase Orders List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-violet-600" /> Purchase Orders
              </h4>
              {purchaseOrders.length === 0 ? (
                <div className="text-slate-500 text-xs italic">No purchase orders drafted.</div>
              ) : (
                purchaseOrders.map((po) => (
                  <div key={po.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <strong className="block text-slate-800">{po.orderNumber}</strong>
                      <span className="block text-slate-550 text-[10px] mt-0.5">{po.supplier?.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 border border-cyan-200 rounded">
                      {po.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-slate-55 rounded-xl border border-dashed border-slate-200">
            <Lock className="w-8 h-8 text-slate-400" />
            <div>
              <h4 className="text-xs font-bold text-slate-700">Supplier Procurement System Locked</h4>
              <p className="text-[10px] text-slate-550 max-w-[400px] mt-1">Activate the Supplier & Purchasing Management plugin (SUP) in settings to enable vendor records, purchase orders, and goods received note tracking.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
