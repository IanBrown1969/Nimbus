"use client";
 
import React from "react";
import { ArrowRight } from "lucide-react";

interface GoldenArrowProps {
  type: "item" | "customer" | "invoice" | "supplier" | "bin" | "warehouse";
  id: string | number;
}

export default function GoldenArrow({ type, id }: GoldenArrowProps) {
  const handleDrilldown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Dispatch a global custom event for the dashboard layout to catch
    window.dispatchEvent(
      new CustomEvent("nimbus-drilldown", {
        detail: { type, id }
      })
    );
  };

  return (
    <button
      type="button"
      onClick={handleDrilldown}
      title={`Drill down to ${type} details`}
      className="inline-flex items-center justify-center p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors cursor-pointer group ml-1"
    >
      <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
