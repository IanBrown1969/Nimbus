"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  ShoppingBag, 
  Sparkles, 
  Languages, 
  CheckCircle, 
  Package,
  Layers,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp
} from "lucide-react";

export default function CustomerPortalCatalog() {
  const [products, setProducts] = useState<any[]>([]);
  const [locale, setLocale] = useState("en-GB");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchWebCatalog();
  }, []);

  const fetchWebCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch web-published products using integration API Key credentials
      const response = await axios.get("http://localhost:5000/api/integration/catalog", {
        headers: {
          "X-Api-Key": "Nimbus_Web_Integration_Key_2026"
        }
      });
      setProducts(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        "Failed to load product catalog. Ensure the admin-api backend is running at http://localhost:5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedName = (namesJsonStr: string) => {
    try {
      const translations = JSON.parse(namesJsonStr);
      return translations[locale] || translations["en-GB"] || "Product";
    } catch {
      return namesJsonStr || "Product";
    }
  };

  const getTranslatedDescription = (descJsonStr: string) => {
    try {
      const translations = JSON.parse(descJsonStr);
      return translations[locale] || translations["en-GB"] || "";
    } catch {
      return descJsonStr || "";
    }
  };

  const formatPrice = (price: number) => {
    const currency = locale === "fr-FR" ? "EUR" : "GBP";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency
    }).format(price);
  };

  // Filter products based on search query
  const filteredProducts = products.filter(prod => {
    const name = getTranslatedName(prod.names).toLowerCase();
    const desc = getTranslatedDescription(prod.descriptions).toLowerCase();
    const sku = prod.sku.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || desc.includes(query) || sku.includes(query);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 pb-20 relative font-sans">
      {/* Decorative Top Lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-indigo-200/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] rounded-full bg-cyan-200/20 blur-[130px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm shadow-slate-100/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900">Nimbus Customer Portal</span>
              <span className="text-[10px] text-slate-500 font-medium">Acme Building Materials</span>
            </div>
          </div>

          {/* Language Switch */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Languages className="w-4 h-4 text-slate-400" /> Locale:
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setLocale("en-GB")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  locale === "en-GB"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                en-GB (GBP)
              </button>
              <button
                onClick={() => setLocale("fr-FR")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  locale === "fr-FR"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                fr-FR (EUR)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-7xl mx-auto px-6 mt-12 space-y-10 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold shadow-sm shadow-indigo-100/50">
            <Sparkles className="w-3.5 h-3.5" /> Direct Contractor B2B Catalog
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl font-heading">
            Acme Building Materials
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Access wholesale contractor pricing, real-time stock levels, and warehouse conversions. Sold in customer units with immediate fulfillment.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-3xl mx-auto bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100/60 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products by name, description, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>
          <div className="flex gap-2.5">
            <button className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-100 hover:text-slate-800 flex items-center gap-2 transition-all">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" /> Filter
            </button>
            <button className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 flex items-center gap-1.5 shadow-md shadow-slate-950/10 transition-all">
              Search <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 max-w-xl mx-auto rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs text-center shadow-sm">
            {error}
          </div>
        )}

        {/* Catalog Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-slate-500 text-xs font-semibold">Loading wholesale catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 max-w-lg mx-auto text-center space-y-3 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800">No Products Found</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto">
              We couldn't find any products matching your criteria or published to the catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((prod) => {
              // Parse images if present
              let imageUrl = "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=400";
              try {
                const urls = JSON.parse(prod.images);
                if (urls.length > 0) imageUrl = urls[0];
              } catch {}

              return (
                <div 
                  key={prod.id} 
                  className="group bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/5 hover:border-slate-300/80 -translate-y-0 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden shadow-sm"
                >
                  {/* Subtle hover gradient badge */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-4">
                    {/* Image box */}
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 relative shadow-inner">
                      <img 
                        src={imageUrl} 
                        alt="Product Image" 
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Meta & Title */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 text-[9px] font-bold font-mono text-indigo-600 bg-indigo-50 border border-indigo-100/60 rounded">
                          {prod.sku}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-full uppercase">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> In Stock
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {getTranslatedName(prod.names)}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal min-h-[32px] line-clamp-2">
                        {getTranslatedDescription(prod.descriptions)}
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Logistics specifications */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-400" /> Unit Type:
                      </span>
                      <span className="font-semibold text-slate-700">Each</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-slate-400" /> Stock Available:
                      </span>
                      <span className="font-bold text-slate-800">
                        {prod.availableQuantity} <span className="text-[10px] text-slate-400 font-medium">Each(s)</span>
                      </span>
                    </div>

                    {/* Price and Add button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Price (Ex. VAT)</span>
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight">{formatPrice(prod.price)}</span>
                      </div>
                      <button className="py-2.5 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 transition-all flex items-center gap-1">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
