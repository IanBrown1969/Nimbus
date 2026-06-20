"use client";
 
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { 
  Sliders, 
  Search, 
  Plus, 
  X, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  Percent, 
  DollarSign, 
  Tag, 
  Calendar,
  Layers,
  Sparkles,
  User,
  Users,
  ChevronDown
} from "lucide-react";
 
interface PricingRule {
  id: string;
  type: "Contract" | "Group" | "Promotion" | "All Customers";
  scope: string; // Target: customer name, group code, promo code
  sku: string;
  productName: string;
  rule: "Fixed Price" | "Discount (%)";
  value: number; // Price or discount rate
  status: "Active" | "Inactive";
  validFrom: string;
  validTo: string;
  minQuantity: number; // Minimum quantity for price break (e.g. 1, 5, 10)
  unitOfSale: "sell" | "stock"; // Selling Unit vs Stocking Unit of sale
}

interface PriorityItem {
  type: "Contract" | "Group" | "Promotion" | "All Customers";
  label: string;
  stopProcessing: boolean;
}
 
export default function PricingSetupPage() {
  const { token, user } = useApp();
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"All" | "Contract" | "Group" | "Promotion" | "All Customers" | "Pricing Check">("All");
  const [search, setSearch] = useState("");
 
  // Customers for the Pricing Checker
  const [customers, setCustomers] = useState<any[]>([]);
 
  // Pricing Checker states
  const [checkerCustomer, setCheckerCustomer] = useState<string>("");
  const [checkerSku, setCheckerSku] = useState<string>("");
  const [checkerUnit, setCheckerUnit] = useState<"sell" | "stock">("sell");
  const [checkerQuantity, setCheckerQuantity] = useState<number>(1);

  // Pricing priority hierarchy list
  const [priorityList, setPriorityList] = useState<PriorityItem[]>([
    { type: "Promotion", label: "Promotional Pricing", stopProcessing: false },
    { type: "Contract", label: "Customer Contract Pricing", stopProcessing: false },
    { type: "Group", label: "Customer Group Pricing", stopProcessing: false },
    { type: "All Customers", label: "All Customer Pricing", stopProcessing: false }
  ]);
 
  // State-based pricing rules list
  const [rules, setRules] = useState<PricingRule[]>([
    {
      id: "PR-001",
      type: "Contract",
      scope: "John Builders Ltd",
      sku: "BRK-BLUE-02",
      productName: "Blue Brick Pallet",
      rule: "Fixed Price",
      value: 120.00,
      status: "Active",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      minQuantity: 1,
      unitOfSale: "stock"
    },
    {
      id: "PR-002",
      type: "Group",
      scope: "Trade Customers Tier 1",
      sku: "CMT-PORT-50",
      productName: "Portland Cement Bag",
      rule: "Discount (%)",
      value: 10,
      status: "Active",
      validFrom: "2026-01-01",
      validTo: "2027-01-01",
      minQuantity: 1,
      unitOfSale: "sell"
    },
    {
      id: "PR-003",
      type: "Promotion",
      scope: "Summer Campaign 22",
      sku: "SND-COARSE-25",
      productName: "Coarse Sand Bag",
      rule: "Discount (%)",
      value: 15,
      status: "Active",
      validFrom: "2026-06-01",
      validTo: "2026-08-31",
      minQuantity: 1,
      unitOfSale: "sell"
    },
    {
      id: "PR-004",
      type: "All Customers",
      scope: "Global Base Pricing",
      sku: "BRK-RED-01",
      productName: "Red Clay Brick Pallet",
      rule: "Fixed Price",
      value: 140.00,
      status: "Active",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      minQuantity: 1,
      unitOfSale: "stock"
    },
    {
      id: "PR-005",
      type: "Contract",
      scope: "John Builders Ltd",
      sku: "BRK-BLUE-02",
      productName: "Blue Brick Pallet",
      rule: "Fixed Price",
      value: 105.00,
      status: "Active",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      minQuantity: 5,
      unitOfSale: "stock"
    }
  ]);
 
  // Form Drawer states
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  
  // Input fields
  const [ruleType, setRuleType] = useState<"Contract" | "Group" | "Promotion" | "All Customers">("Contract");
  const [scope, setScope] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [ruleAction, setRuleAction] = useState<"Fixed Price" | "Discount (%)">("Fixed Price");
  const [value, setValue] = useState(0);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [ruleUnitOfSale, setRuleUnitOfSale] = useState<"sell" | "stock">("sell");
  const [error, setError] = useState<string | null>(null);

  // Searchable customer dropdown states
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Column filtering states
  const [filterId, setFilterId] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterScope, setFilterScope] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterUnit, setFilterUnit] = useState("All");
  const [filterMinQty, setFilterMinQty] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };
 
  useEffect(() => {
    if (token) {
      fetchStock();
      fetchCustomers();
    }
  }, [token]);
 
  const fetchCustomers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
      if (res.data.length > 0) {
        setCheckerCustomer(res.data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };
 
  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/warehouse/stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockList(res.data);
      if (res.data.length > 0) {
        setSelectedSku(res.data[0].sku);
        setCheckerSku(res.data[0].sku);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const movePriority = (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= priorityList.length) return;
    const list = [...priorityList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setPriorityList(list);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    const list = [...priorityList];
    const [removed] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, removed);
    setPriorityList(list);
  };
 
  const handleSelectRule = (rule: PricingRule) => {
    setIsCreateMode(false);
    setSelectedRule(rule);
    setRuleType(rule.type);
    setScope(rule.scope);
    setSelectedSku(rule.sku);
    setRuleAction(rule.rule);
    setValue(rule.value);
    setValidFrom(rule.validFrom);
    setValidTo(rule.validTo);
    setStatus(rule.status);
    setMinQuantity(rule.minQuantity || 1);
    setRuleUnitOfSale(rule.unitOfSale || "sell");
    setCustomerSearch(rule.type === "Contract" ? rule.scope : "");
    setError(null);
    setShowDrawer(true);
  };
 
  const handleOpenCreateDrawer = () => {
    setIsCreateMode(true);
    setSelectedRule(null);
    setRuleType("Contract");
    setScope("");
    if (stockList.length > 0) {
      setSelectedSku(stockList[0].sku);
    }
    setRuleAction("Fixed Price");
    setValue(0);
    setValidFrom(new Date().toISOString().split("T")[0]);
    setValidTo(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setStatus("Active");
    setMinQuantity(1);
    setRuleUnitOfSale("sell");
    setCustomerSearch("");
    setError(null);
    setShowDrawer(true);
  };
 
  const closeCustomerDropdown = () => {
    setShowCustDropdown(false);
    // Validate if customerSearch matches a valid customer name
    const match = customers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase());
    if (match) {
      setCustomerSearch(match.name);
      setScope(match.name);
    } else {
      // Revert to scope if scope is a valid customer
      const scopeMatch = customers.find(c => c.name.toLowerCase() === scope.toLowerCase());
      if (scopeMatch) {
        setCustomerSearch(scopeMatch.name);
      } else {
        setCustomerSearch("");
        setScope("");
      }
    }
  };

  const isRuleQuantityMatched = (rule: PricingRule, checkerQty: number, checkerUnit: "sell" | "stock", ratio: number) => {
    let equivalentQty = checkerQty;
    if (checkerUnit !== rule.unitOfSale) {
      if (checkerUnit === "sell" && rule.unitOfSale === "stock") {
        equivalentQty = checkerQty / ratio;
      } else {
        equivalentQty = checkerQty * ratio;
      }
    }
    return equivalentQty >= rule.minQuantity;
  };

  const getRulePriceGbp = (rule: PricingRule, requestedUnit: "sell" | "stock", ratio: number, stockingBasePriceGbp: number) => {
    let ruleUnitPrice = 0;
    if (rule.rule === "Fixed Price") {
      ruleUnitPrice = rule.value;
    } else {
      // For discounts, calculate relative to base price of the rule's unit of sale
      const ruleBasePrice = rule.unitOfSale === "stock" ? stockingBasePriceGbp : stockingBasePriceGbp / ratio;
      ruleUnitPrice = ruleBasePrice * (1 - rule.value / 100);
    }

    // Convert rule unit price to the requested unit of sale
    if (rule.unitOfSale === requestedUnit) {
      return ruleUnitPrice;
    } else if (rule.unitOfSale === "stock" && requestedUnit === "sell") {
      return ruleUnitPrice / ratio;
    } else {
      return ruleUnitPrice * ratio;
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) {
      setError("Please select a valid product SKU.");
      return;
    }

    let finalScope = scope;
    if (ruleType === "Contract") {
      const validCustomer = customers.find(
        c => c.name.toLowerCase() === customerSearch.toLowerCase() ||
             c.name.toLowerCase() === scope.toLowerCase()
      );
      if (!validCustomer) {
        setError("Please select a valid customer from the dropdown list.");
        return;
      }
      finalScope = validCustomer.name;
    } else if (ruleType === "All Customers") {
      finalScope = "Global Base Pricing";
    }

    const prod = stockList.find(s => s.sku === selectedSku);
    const productName = prod ? (prod.name ? JSON.parse(prod.name)["en-GB"] || prod.sku : prod.sku) : selectedSku;

    if (isCreateMode) {
      const newRule: PricingRule = {
        id: `PR-${String(rules.length + 1).padStart(3, "0")}`,
        type: ruleType,
        scope: finalScope,
        sku: selectedSku,
        productName: productName,
        rule: ruleAction,
        value: Number(value),
        status: status,
        validFrom: validFrom,
        validTo: validTo,
        minQuantity: Number(minQuantity),
        unitOfSale: ruleUnitOfSale
      };
      setRules(prev => [...prev, newRule]);
      alert("Pricing Rule created successfully!");
    } else if (selectedRule) {
      setRules(prev => prev.map(r => r.id === selectedRule.id ? {
        ...r,
        type: ruleType,
        scope: finalScope,
        sku: selectedSku,
        productName: productName,
        rule: ruleAction,
        value: Number(value),
        status: status,
        validFrom: validFrom,
        validTo: validTo,
        minQuantity: Number(minQuantity),
        unitOfSale: ruleUnitOfSale
      } : r));
      alert("Pricing Rule updated successfully!");
    }
    setShowDrawer(false);
  };
 
  // Tab, Search, and Column filtering logic
  const filteredRules = rules.filter(r => {
    // 1. Tab filter
    const matchesTab = activeTab === "All" || r.type === activeTab;

    // 2. Global search filter
    const matchesSearch = 
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.scope.toLowerCase().includes(search.toLowerCase());

    // 3. Column-specific filters
    const matchesFilterId = r.id.toLowerCase().includes(filterId.toLowerCase());
    
    const matchesFilterType = filterType === "All" || r.type === filterType;
    
    const matchesFilterScope = r.scope.toLowerCase().includes(filterScope.toLowerCase());
    
    const matchesFilterSku = 
      r.sku.toLowerCase().includes(filterSku.toLowerCase()) ||
      r.productName.toLowerCase().includes(filterSku.toLowerCase());
      
    const matchesFilterUnit = filterUnit === "All" || r.unitOfSale === filterUnit;
    
    const matchesFilterMinQty = !filterMinQty || r.minQuantity.toString().includes(filterMinQty);
    
    // Formula action matches fixed price value or discount value
    const actionText = r.rule === "Fixed Price" ? `£${r.value.toFixed(2)}` : `${r.value}% Off`;
    const matchesFilterAction = actionText.toLowerCase().includes(filterAction.toLowerCase());
    
    // Date validity matches range text
    const dateText = `${r.validFrom} to ${r.validTo}`;
    const matchesFilterDate = dateText.toLowerCase().includes(filterDate.toLowerCase());
    
    const matchesFilterStatus = filterStatus === "All" || r.status === filterStatus;

    return matchesTab && matchesSearch && 
           matchesFilterId && matchesFilterType && matchesFilterScope && 
           matchesFilterSku && matchesFilterUnit && matchesFilterMinQty && 
           matchesFilterAction && matchesFilterDate && matchesFilterStatus;
  });

  const sortedRules = [...filteredRules].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";

    switch (sortField) {
      case "id":
        valA = a.id;
        valB = b.id;
        break;
      case "type":
        valA = a.type;
        valB = b.type;
        break;
      case "scope":
        valA = a.scope;
        valB = b.scope;
        break;
      case "sku":
        valA = a.sku + a.productName;
        valB = b.sku + b.productName;
        break;
      case "unit":
        // Resolve actual unit name for sorting
        const prodA = stockList.find(s => s.sku === a.sku);
        const prodB = stockList.find(s => s.sku === b.sku);
        valA = a.unitOfSale === "stock" ? prodA?.stockUnitOfSale || "Pallet" : prodA?.sellUnitOfSale || "Each";
        valB = b.unitOfSale === "stock" ? prodB?.stockUnitOfSale || "Pallet" : prodB?.sellUnitOfSale || "Each";
        break;
      case "minQuantity":
        valA = a.minQuantity;
        valB = b.minQuantity;
        break;
      case "value":
        valA = a.value;
        valB = b.value;
        break;
      case "validity":
        valA = a.validFrom;
        valB = b.validFrom;
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      default:
        valA = a.id;
        valB = b.id;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const hasFilters = !!(filterId || filterType !== "All" || filterScope || filterSku || filterUnit !== "All" || filterMinQty || filterAction || filterDate || filterStatus !== "All");

  const clearAllFilters = () => {
    setFilterId("");
    setFilterType("All");
    setFilterScope("");
    setFilterSku("");
    setFilterUnit("All");
    setFilterMinQty("");
    setFilterAction("");
    setFilterDate("");
    setFilterStatus("All");
  };
 
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Contract":
        return { label: "Contract Pricing", bg: "bg-indigo-50 border-indigo-200 text-indigo-700", icon: User };
      case "Group":
        return { label: "Group Pricing", bg: "bg-cyan-50 border-cyan-200 text-cyan-700", icon: Users };
      case "Promotion":
        return { label: "Promo Pricing", bg: "bg-amber-50 border-amber-250 text-amber-800", icon: Sparkles };
      case "All Customers":
      default:
        return { label: "All Customers", bg: "bg-slate-100 border-slate-200 text-slate-700", icon: Layers };
    }
  };
 
  const renderSortHeader = (label: string, field: string, align: "left" | "center" = "left") => {
    const isSorted = sortField === field;
    return (
      <div 
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 cursor-pointer select-none hover:text-slate-800 transition-colors ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span>{label}</span>
        <span className="text-[9px] text-slate-400 font-bold font-mono">
          {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Settings</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Pricing & Discount Setup</h2>
          <p className="text-slate-655 text-sm mt-1">Configure global, group-level, promotional, and custom contract pricing rule hierarchies.</p>
        </div>
        
        <button
          onClick={handleOpenCreateDrawer}
          className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Define Pricing Rule
        </button>
      </div>
 
      {/* Search and Tabs Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(["All", "Contract", "Group", "Promotion", "All Customers", "Pricing Check"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3.5 rounded-lg border transition-all cursor-pointer ${
                activeTab === tab 
                  ? "bg-violet-50 border-violet-200 text-violet-750 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "All" ? "All Price Rules" : tab}
            </button>
          ))}
        </div>
 
        {/* Search */}
        {activeTab !== "Pricing Check" && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="py-2 px-3 text-[10px] text-rose-600 hover:text-rose-700 font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100/50 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Clear Column Filters
              </button>
            )}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, name, scope..."
                className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>
 
      {/* Content Area */}
      {activeTab === "Pricing Check" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Inputs & Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Draggable Hierarchy Settings Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-650" />
                  Priority Hierarchy Order
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Drag items or click the up/down arrows to prioritize. Check "Stop" to halt evaluation when a rule is matched in that tier.
                </p>
              </div>

              <div className="space-y-2">
                {priorityList.map((item, idx) => {
                  const Icon = item.type === "Contract" ? User : item.type === "Group" ? Users : item.type === "Promotion" ? Sparkles : Layers;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="p-3 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-between gap-3 hover:border-violet-300 hover:bg-violet-50/10 transition-all cursor-move active:scale-99 select-none"
                    >
                      <div className="flex items-center gap-2">
                        {/* Drag Handle Icon */}
                        <div className="text-slate-400">
                          <svg className="w-4 h-4 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <span className="p-1 rounded bg-white border border-slate-200 text-slate-500">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stop Processing checkbox */}
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-500 mr-1 select-none">
                          <input
                            type="checkbox"
                            checked={item.stopProcessing}
                            onChange={(e) => {
                              const list = [...priorityList];
                              list[idx].stopProcessing = e.target.checked;
                              setPriorityList(list);
                            }}
                            className="w-3.5 h-3.5 text-violet-650 focus:ring-violet-500 border-slate-300 rounded"
                          />
                          <span>Stop</span>
                        </label>

                        {/* Arrows */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePriority(idx, -1)}
                            className="p-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded disabled:opacity-30 cursor-pointer text-[8px] font-bold"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === priorityList.length - 1}
                            onClick={() => movePriority(idx, 1)}
                            className="p-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded disabled:opacity-30 cursor-pointer text-[8px] font-bold"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selector Options Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-650" />
                  Calculator Options
                </h3>
                <p className="text-slate-500 text-[11px]">Select parameters to verify calculated output values.</p>
              </div>

              <div className="space-y-4">
                {/* Customer Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Select Customer</label>
                  {customers.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">Loading customers...</div>
                  ) : (
                    <select
                      value={checkerCustomer}
                      onChange={(e) => setCheckerCustomer(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.customerRef} - {c.name} ({c.defaultCurrencyCode})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* SKU Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Select Product (SKU)</label>
                  {stockList.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">Loading products...</div>
                  ) : (
                    <select
                      value={checkerSku}
                      onChange={(e) => setCheckerSku(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    >
                      {stockList.map(s => (
                        <option key={s.id} value={s.sku}>
                          {s.sku} - {getTranslatedName(s.name)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Unit of Sale Selector */}
                {(() => {
                  const stockObj = stockList.find(s => s.sku === checkerSku);
                  if (!stockObj) return null;
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Unit of Sale</label>
                        <select
                          value={checkerUnit}
                          onChange={(e) => setCheckerUnit(e.target.value as any)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                        >
                          <option value="sell">Selling Unit ({stockObj.sellUnitOfSale || "Each"})</option>
                          <option value="stock">Stocking Unit ({stockObj.stockUnitOfSale || "Pallet"})</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={checkerQuantity}
                          onChange={(e) => setCheckerQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                        />
                      </div>
                      <span className="col-span-2 block text-[10px] text-slate-400 italic">
                        Ratio: 1 {stockObj.stockUnitOfSale || "Pallet"} = {stockObj.conversionRatio || 1} {stockObj.sellUnitOfSale || "Each"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Selected Context summary */}
              {(() => {
                const customerObj = customers.find(c => c.id.toString() === checkerCustomer);
                const stockObj = stockList.find(s => s.sku === checkerSku);
                if (!customerObj || !stockObj) return null;

                return (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px] text-slate-600">
                    <div className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Selected Context Summary</div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer Email:</span>
                      <span className="font-semibold text-slate-800">{customerObj.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer Currency:</span>
                      <span className="font-mono font-bold text-violet-750 bg-violet-50 px-1.5 py-0.25 rounded border border-violet-100">{customerObj.defaultCurrencyCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Price (Per Stocking Unit):</span>
                      <span className="font-semibold text-slate-800">£{Number(stockObj.basePrice || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Results Section Column */}
          <div className="lg:col-span-2 space-y-6">
            {(() => {
              const customerObj = customers.find(c => c.id.toString() === checkerCustomer);
              const stockObj = stockList.find(s => s.sku === checkerSku);
              
              if (!customerObj || !stockObj) {
                return (
                  <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    Select a customer and product to view price calculations.
                  </div>
                );
              }

              const ratio = stockObj.conversionRatio || 1;
              const rawBase = stockObj.basePrice || 0;
              const activeBase = checkerUnit === "stock" ? rawBase : rawBase / ratio;

              // Rule search and logic
              const activeRules = rules.filter(r => r.sku === checkerSku && r.status === "Active");

              // Evaluate in Priority List order
              const candidates: { type: string; price: number; ruleId: string; description: string; ruleText: string }[] = [];
              const logs: { type: "match" | "miss" | "halt" | "info"; message: string }[] = [];
              
              logs.push({
                type: "info",
                message: `Initiating price evaluation for SKU: ${checkerSku}, Customer: ${customerObj.name}, Qty: ${checkerQuantity} ${checkerUnit === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each")}. Base unit price: £${activeBase.toFixed(4)} GBP`
              });

              let isHalted = false;

              for (const priority of priorityList) {
                if (isHalted) {
                  logs.push({
                    type: "miss",
                    message: `Bypassing evaluation of [${priority.label}] due to previous Halt trigger.`
                  });
                  continue;
                }

                if (priority.type === "Contract") {
                  const matchingRules = activeRules.filter(r => 
                    r.type === "Contract" && 
                    (r.scope.toLowerCase() === customerObj.name?.toLowerCase() || 
                     r.scope.toLowerCase() === customerObj.companyName?.toLowerCase()) &&
                    isRuleQuantityMatched(r, checkerQuantity, checkerUnit, ratio)
                  );

                  if (matchingRules.length > 0) {
                    matchingRules.sort((a, b) => {
                      const qtyA = a.unitOfSale === "stock" ? a.minQuantity * ratio : a.minQuantity;
                      const qtyB = b.unitOfSale === "stock" ? b.minQuantity * ratio : b.minQuantity;
                      return qtyB - qtyA;
                    });
                    const rule = matchingRules[0];
                    const calculatedPrice = getRulePriceGbp(rule, checkerUnit, ratio, rawBase);
                    
                    const ruleUnitName = rule.unitOfSale === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");
                    const checkerUnitName = checkerUnit === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");

                    candidates.push({
                      type: "Contract",
                      price: calculatedPrice,
                      ruleId: rule.id,
                      description: `Custom Contract Rule ${rule.id} (${rule.minQuantity}+ ${ruleUnitName} price break)`,
                      ruleText: rule.rule === "Fixed Price" 
                        ? `Fixed Price £${rule.value.toFixed(2)} per ${ruleUnitName}` 
                        : `${rule.value}% discount on ${ruleUnitName}`
                    });
                    
                    const conversionMessage = rule.unitOfSale !== checkerUnit
                      ? ` (converted from £${rule.value.toFixed(2)} per ${ruleUnitName})`
                      : "";

                    logs.push({
                      type: "match",
                      message: `Matched Contract Rule ${rule.id} (Break: ${rule.minQuantity}+ ${ruleUnitName}): Resolved price is £${calculatedPrice.toFixed(4)} GBP per ${checkerUnitName}${conversionMessage}`
                    });

                    if (priority.stopProcessing) {
                      isHalted = true;
                      logs.push({
                        type: "halt",
                        message: `Halt trigger enabled for [${priority.label}]. Aborting subsequent priority levels.`
                      });
                    }
                  } else {
                    logs.push({
                      type: "miss",
                      message: `No active Contract rules match customer '${customerObj.name}' for SKU '${checkerSku}' at quantity ${checkerQuantity}.`
                    });
                  }

                } else if (priority.type === "Group") {
                  const matchingRules = activeRules.filter(r => 
                    r.type === "Group" && 
                    isRuleQuantityMatched(r, checkerQuantity, checkerUnit, ratio)
                  );

                  if (matchingRules.length > 0) {
                    matchingRules.sort((a, b) => {
                      const qtyA = a.unitOfSale === "stock" ? a.minQuantity * ratio : a.minQuantity;
                      const qtyB = b.unitOfSale === "stock" ? b.minQuantity * ratio : b.minQuantity;
                      return qtyB - qtyA;
                    });
                    const rule = matchingRules[0];
                    const calculatedPrice = getRulePriceGbp(rule, checkerUnit, ratio, rawBase);
                    
                    const ruleUnitName = rule.unitOfSale === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");
                    const checkerUnitName = checkerUnit === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");

                    candidates.push({
                      type: "Group",
                      price: calculatedPrice,
                      ruleId: rule.id,
                      description: `Group Rule ${rule.id} (${rule.minQuantity}+ ${ruleUnitName} price break)`,
                      ruleText: rule.rule === "Fixed Price" 
                        ? `Fixed Price £${rule.value.toFixed(2)} per ${ruleUnitName}` 
                        : `${rule.value}% discount on ${ruleUnitName}`
                    });
                    
                    const conversionMessage = rule.unitOfSale !== checkerUnit
                      ? ` (converted from £${rule.value.toFixed(2)} per ${ruleUnitName})`
                      : "";

                    logs.push({
                      type: "match",
                      message: `Matched Group Rule ${rule.id} (Break: ${rule.minQuantity}+ ${ruleUnitName}): Resolved price is £${calculatedPrice.toFixed(4)} GBP per ${checkerUnitName}${conversionMessage}`
                    });

                    if (priority.stopProcessing) {
                      isHalted = true;
                      logs.push({
                        type: "halt",
                        message: `Halt trigger enabled for [${priority.label}]. Aborting subsequent priority levels.`
                      });
                    }
                  } else {
                    logs.push({
                      type: "miss",
                      message: `No active Group rules match SKU '${checkerSku}' at quantity ${checkerQuantity}.`
                    });
                  }

                } else if (priority.type === "Promotion") {
                  const matchingRules = activeRules.filter(r => 
                    r.type === "Promotion" && 
                    isRuleQuantityMatched(r, checkerQuantity, checkerUnit, ratio)
                  );

                  if (matchingRules.length > 0) {
                    matchingRules.sort((a, b) => {
                      const qtyA = a.unitOfSale === "stock" ? a.minQuantity * ratio : a.minQuantity;
                      const qtyB = b.unitOfSale === "stock" ? b.minQuantity * ratio : b.minQuantity;
                      return qtyB - qtyA;
                    });
                    const rule = matchingRules[0];
                    const calculatedPrice = getRulePriceGbp(rule, checkerUnit, ratio, rawBase);
                    
                    const ruleUnitName = rule.unitOfSale === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");
                    const checkerUnitName = checkerUnit === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");

                    candidates.push({
                      type: "Promotion",
                      price: calculatedPrice,
                      ruleId: rule.id,
                      description: `Promotion Rule ${rule.id} (${rule.minQuantity}+ ${ruleUnitName} price break)`,
                      ruleText: rule.rule === "Fixed Price" 
                        ? `Fixed Price £${rule.value.toFixed(2)} per ${ruleUnitName}` 
                        : `${rule.value}% discount on ${ruleUnitName}`
                    });
                    
                    const conversionMessage = rule.unitOfSale !== checkerUnit
                      ? ` (converted from £${rule.value.toFixed(2)} per ${ruleUnitName})`
                      : "";

                    logs.push({
                      type: "match",
                      message: `Matched Promotional Rule ${rule.id} (Break: ${rule.minQuantity}+ ${ruleUnitName}): Resolved price is £${calculatedPrice.toFixed(4)} GBP per ${checkerUnitName}${conversionMessage}`
                    });

                    if (priority.stopProcessing) {
                      isHalted = true;
                      logs.push({
                        type: "halt",
                        message: `Halt trigger enabled for [${priority.label}]. Aborting subsequent priority levels.`
                      });
                    }
                  } else {
                    logs.push({
                      type: "miss",
                      message: `No active Promotional rules match SKU '${checkerSku}' at quantity ${checkerQuantity}.`
                    });
                  }

                } else if (priority.type === "All Customers") {
                  const matchingRules = activeRules.filter(r => 
                    r.type === "All Customers" && 
                    isRuleQuantityMatched(r, checkerQuantity, checkerUnit, ratio)
                  );

                  if (matchingRules.length > 0) {
                    matchingRules.sort((a, b) => {
                      const qtyA = a.unitOfSale === "stock" ? a.minQuantity * ratio : a.minQuantity;
                      const qtyB = b.unitOfSale === "stock" ? b.minQuantity * ratio : b.minQuantity;
                      return qtyB - qtyA;
                    });
                    const rule = matchingRules[0];
                    const calculatedPrice = getRulePriceGbp(rule, checkerUnit, ratio, rawBase);
                    
                    const ruleUnitName = rule.unitOfSale === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");
                    const checkerUnitName = checkerUnit === "stock" ? (stockObj.stockUnitOfSale || "Pallet") : (stockObj.sellUnitOfSale || "Each");

                    candidates.push({
                      type: "All Customers",
                      price: calculatedPrice,
                      ruleId: rule.id,
                      description: `All Customer Rule ${rule.id} (${rule.minQuantity}+ ${ruleUnitName} price break)`,
                      ruleText: rule.rule === "Fixed Price" 
                        ? `Fixed Price £${rule.value.toFixed(2)} per ${ruleUnitName}` 
                        : `${rule.value}% discount on ${ruleUnitName}`
                    });
                    
                    const conversionMessage = rule.unitOfSale !== checkerUnit
                      ? ` (converted from £${rule.value.toFixed(2)} per ${ruleUnitName})`
                      : "";

                    logs.push({
                      type: "match",
                      message: `Matched All Customer Rule ${rule.id} (Break: ${rule.minQuantity}+ ${ruleUnitName}): Resolved price is £${calculatedPrice.toFixed(4)} GBP per ${checkerUnitName}${conversionMessage}`
                    });

                    if (priority.stopProcessing) {
                      isHalted = true;
                      logs.push({
                        type: "halt",
                        message: `Halt trigger enabled for [${priority.label}]. Aborting subsequent priority levels.`
                      });
                    }
                  } else {
                    logs.push({
                      type: "miss",
                      message: `No active All Customer rules match SKU '${checkerSku}' at quantity ${checkerQuantity}.`
                    });
                  }
                }
              }

              // Evaluate default fallbacks if no rules matched
              let finalBaseGbp = 0;
              let finalDetail = "";
              let winningSource = "";

              if (candidates.length > 0) {
                // Find cheapest among matches
                candidates.sort((a, b) => a.price - b.price);
                const winner = candidates[0];
                finalBaseGbp = winner.price;
                finalDetail = winner.description;
                winningSource = winner.type;
                logs.push({
                  type: "info",
                  message: `Cheapest matched custom rule selected: ${winner.description} at £${winner.price.toFixed(4)} GBP`
                });
              } else {
                logs.push({
                  type: "info",
                  message: `No matching custom rules were found. Falling back to default discount structure: Contract (20% off), Group (10% off), Promotion (15% off), Base (standard price). Selected: Cheapest fallback.`
                });
                
                const contractFallback = activeBase * 0.8;
                const groupFallback = activeBase * 0.9;
                const promoFallback = activeBase * 0.85;
                const baseFallback = activeBase;

                const fallbacks = [
                  { type: "Contract", price: contractFallback, description: "Default Contract (20% Off)" },
                  { type: "Group", price: groupFallback, description: "Default Group (10% Off)" },
                  { type: "Promotion", price: promoFallback, description: "Default Promotion (15% Off)" },
                  { type: "All Customers", price: baseFallback, description: "Standard Base Price" }
                ];
                
                fallbacks.sort((a, b) => a.price - b.price);
                finalBaseGbp = fallbacks[0].price;
                finalDetail = fallbacks[0].description;
                winningSource = fallbacks[0].type;
              }

              // Currencies conversions
              const custCurrency = customerObj.defaultCurrencyCode || "GBP";
              const rate = getExchangeRate(custCurrency);
              const finalConvertedPrice = finalBaseGbp * rate;

              // Pricing Tiers Status indicators
              const tiers = priorityList.map(priority => {
                const matched = candidates.find(c => c.type === priority.type);
                const isWinner = matched && Math.abs(matched.price - finalBaseGbp) < 0.0001;
                
                let resolvedPriceGbp = 0;
                let resolutionDetail = "";

                if (matched) {
                  resolvedPriceGbp = matched.price;
                  resolutionDetail = matched.ruleText;
                } else {
                  // Fallback
                  if (priority.type === "Contract") {
                    resolvedPriceGbp = activeBase * 0.8;
                    resolutionDetail = "Fallback: 20% Discount";
                  } else if (priority.type === "Group") {
                    resolvedPriceGbp = activeBase * 0.9;
                    resolutionDetail = "Fallback: 10% Discount";
                  } else if (priority.type === "Promotion") {
                    resolvedPriceGbp = activeBase * 0.85;
                    resolutionDetail = "Fallback: 15% Discount";
                  } else {
                    resolvedPriceGbp = activeBase;
                    resolutionDetail = "Fallback: Standard Base Price";
                  }
                }

                return {
                  type: priority.type,
                  label: priority.label,
                  isMatched: !!matched,
                  isWinner: isWinner || (!matched && Math.abs(resolvedPriceGbp - finalBaseGbp) < 0.0001 && candidates.length === 0),
                  priceGbp: resolvedPriceGbp,
                  resolutionText: resolutionDetail
                };
              });

              return (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="p-6 rounded-2xl border border-emerald-250 bg-emerald-50/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-mono">Calculated Best Applied Price</span>
                      <h4 className="text-3xl font-extrabold text-emerald-950 font-mono mt-1">
                        {formatMoney(finalConvertedPrice, custCurrency)}
                      </h4>
                      <p className="text-slate-550 text-[11px] mt-1">
                        Optimized from the lowest available active tier. (Base: £{finalBaseGbp.toFixed(4)} GBP at rate {rate.toFixed(2)}x)
                      </p>
                    </div>

                    <div className="px-3.5 py-2 bg-white rounded-xl border border-emerald-200/80 shadow-xs flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>
                        {finalDetail}
                      </span>
                    </div>
                  </div>

                  {/* Grid of Tiers based on Priority list order */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tiers.map((tier) => {
                      const Icon = tier.type === "Contract" ? User : tier.type === "Group" ? Users : tier.type === "Promotion" ? Sparkles : Layers;
                      const badgeDetails = getTypeBadge(tier.type);

                      return (
                        <div 
                          key={tier.type}
                          className={`p-5 rounded-2xl border transition-all ${
                            tier.isWinner 
                              ? "bg-white border-emerald-350 shadow-md ring-2 ring-emerald-500/10 scale-102" 
                              : "bg-white border-slate-200 hover:border-slate-350 shadow-xs"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${badgeDetails.bg}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {badgeDetails.label}
                            </span>
                            {tier.isWinner && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded uppercase font-mono">
                                Applied Price
                              </span>
                            )}
                          </div>

                          <div className="mt-4 space-y-1">
                            <div className="text-2xl font-bold font-mono text-slate-850">
                              {formatMoney(tier.priceGbp * rate, custCurrency)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Equivalent to: £{tier.priceGbp.toFixed(4)} GBP
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Source status:</span>
                            <span className={`font-semibold italic font-mono ${tier.isMatched ? "text-emerald-700" : "text-slate-500"}`}>
                              {tier.isMatched ? "Matched Custom Rule" : "Default Fallback"} ({tier.resolutionText})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Audit Logs Box */}
                  <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-violet-650" />
                      Rule Evaluation Audit Trail Log
                    </h3>
                    <div className="space-y-2 font-mono text-[10px] text-slate-650 bg-slate-50 p-4 rounded-xl border border-slate-150 max-h-64 overflow-y-auto">
                      {logs.map((log, idx) => {
                        let indicator = "⚙️";
                        let textStyle = "text-slate-600";
                        if (log.type === "match") {
                          indicator = "✅";
                          textStyle = "text-emerald-700 font-bold";
                        } else if (log.type === "halt") {
                          indicator = "🛑";
                          textStyle = "text-rose-700 font-bold";
                        } else if (log.type === "info") {
                          indicator = "ℹ️";
                          textStyle = "text-violet-650";
                        } else if (log.type === "miss") {
                          indicator = "⚪";
                          textStyle = "text-slate-400";
                        }
                        return (
                          <div key={idx} className={`flex items-start gap-2 py-0.5 border-b border-slate-100/50 last:border-0 ${textStyle}`}>
                            <span>{indicator}</span>
                            <span>{log.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
             <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/75">
                <th className="py-3 px-4 select-none">
                  {renderSortHeader("Rule ID", "id")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterId}
                    onChange={(e) => setFilterId(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans"
                  />
                </th>
                <th className="py-3 px-4 select-none">
                  {renderSortHeader("Pricing Type", "type")}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 focus:outline-none focus:border-violet-500 font-sans"
                  >
                    <option value="All">All Tiers</option>
                    <option value="Contract">Contract</option>
                    <option value="Group">Group</option>
                    <option value="Promotion">Promotion</option>
                    <option value="All Customers">All Customers</option>
                  </select>
                </th>
                <th className="py-3 px-4 select-none">
                  {renderSortHeader("Target Scope", "scope")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterScope}
                    onChange={(e) => setFilterScope(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans"
                  />
                </th>
                <th className="py-3 px-4 select-none">
                  {renderSortHeader("Product Target", "sku")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterSku}
                    onChange={(e) => setFilterSku(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans"
                  />
                </th>
                <th className="py-3 px-4 select-none text-center">
                  {renderSortHeader("Unit", "unit", "center")}
                  <select
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 focus:outline-none focus:border-violet-500 font-sans"
                  >
                    <option value="All">All Units</option>
                    <option value="sell">Selling</option>
                    <option value="stock">Stocking</option>
                  </select>
                </th>
                <th className="py-3 px-4 select-none text-center">
                  {renderSortHeader("Price Break", "minQuantity", "center")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterMinQty}
                    onChange={(e) => setFilterMinQty(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans text-center"
                  />
                </th>
                <th className="py-3 px-4 select-none">
                  {renderSortHeader("Formula Action", "value")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans"
                  />
                </th>
                <th className="py-3 px-4 select-none text-center">
                  {renderSortHeader("Date Validity", "validity", "center")}
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 placeholder-slate-350 focus:outline-none focus:border-violet-500 font-sans text-center"
                  />
                </th>
                <th className="py-3 px-4 select-none text-center">
                  {renderSortHeader("Status", "status", "center")}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1.5 text-[9px] px-1 py-0.5 bg-white border border-slate-200 rounded font-normal text-slate-700 focus:outline-none focus:border-violet-500 font-sans"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {sortedRules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-slate-500 text-xs text-center py-12 bg-slate-50/10 font-medium">
                    No pricing rules match your search or filter configuration.
                  </td>
                </tr>
              ) : (
                sortedRules.map((rule) => {
                  const badge = getTypeBadge(rule.type);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr 
                      key={rule.id} 
                      onClick={() => handleSelectRule(rule)}
                      className="hover:bg-slate-50/65 text-slate-700 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-violet-650">{rule.id}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${badge.bg}`}>
                          <BadgeIcon className="w-2.5 h-2.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{rule.scope}</td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className="font-mono text-violet-750 block text-[10px]">{rule.sku}</span>
                        <span className="text-slate-500 text-[10px] font-normal block">{rule.productName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono text-[10px]">
                        {(() => {
                          const prod = stockList.find(s => s.sku === rule.sku);
                          if (rule.unitOfSale === "stock") {
                            return prod?.stockUnitOfSale || "Pallet";
                          }
                          return prod?.sellUnitOfSale || "Each";
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono">
                        {rule.minQuantity || 1}+
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          {rule.rule === "Fixed Price" ? (
                            <span className="text-emerald-700 flex items-center gap-0.5">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                              £{rule.value.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-violet-750 flex items-center gap-0.5">
                              <Percent className="w-3.5 h-3.5 text-violet-500" />
                              {rule.value}% Off
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[10px]">
                        {rule.validFrom} to {rule.validTo}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          rule.status === "Active" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {rule.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
 
      {/* Create / Edit Rule Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest block font-mono">
                  {isCreateMode ? "New Pricing Rule" : selectedRule?.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-5 h-5 text-violet-650" />
                  {isCreateMode ? "Define Pricing Rule" : "Edit Pricing Rule Card"}
                </h3>
              </div>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
 
            {/* Form */}
            <form onSubmit={handleSaveRule} className="space-y-4 flex-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-violet-600" /> Rule Configurations
              </h4>
 
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
 
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Pricing Category Type</label>
                    <select
                      value={ruleType}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        setRuleType(newType);
                        setScope("");
                        setCustomerSearch("");
                        setError(null);
                      }}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 font-sans"
                    >
                      <option value="Contract">Customer Contract Pricing</option>
                      <option value="Group">Customer Group Pricing</option>
                      <option value="Promotion">Promotional Pricing</option>
                      <option value="All Customers">All Customer Pricing</option>
                    </select>
                  </div>
 
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Target Scope Description</label>
                    {ruleType === "Contract" ? (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Search & select customer..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setScope(e.target.value);
                            setShowCustDropdown(true);
                          }}
                          onFocus={() => setShowCustDropdown(true)}
                          className="w-full mt-1 text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 text-slate-400 pointer-events-none">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        {showCustDropdown && (
                          <>
                            {/* Dropdown overlay backdrop */}
                            <div className="fixed inset-0 z-10" onClick={closeCustomerDropdown} />
                            <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-250 rounded-lg shadow-lg z-20 divide-y divide-slate-100 text-xs">
                              {customers.filter(c => 
                                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                c.customerRef.toLowerCase().includes(customerSearch.toLowerCase())
                              ).length === 0 ? (
                                <div className="p-2 text-slate-500 italic">No customers found</div>
                              ) : (
                                customers.filter(c => 
                                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                  c.customerRef.toLowerCase().includes(customerSearch.toLowerCase())
                                ).map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setScope(c.name);
                                      setCustomerSearch(c.name);
                                      setShowCustDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-violet-50 hover:text-violet-850 transition-colors flex items-center justify-between text-xs font-semibold"
                                  >
                                    <div>
                                      <span className="font-mono text-violet-650 font-bold mr-2">{c.customerRef}</span>
                                      <span className="font-semibold text-slate-700">{c.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-450 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150">
                                      {c.defaultCurrencyCode}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        required={ruleType !== "All Customers"}
                        disabled={ruleType === "All Customers"}
                        value={ruleType === "All Customers" ? "Global Base Pricing" : scope}
                        onChange={(e) => setScope(e.target.value)}
                        placeholder={
                          ruleType === "Group" ? "e.g. Retail Customers" : 
                          "e.g. Spring Sale Campaign"
                        }
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800 disabled:opacity-50"
                      />
                    )}
                  </div>
                </div>
 
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Apply to Product (SKU)</label>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  >
                    {stockList.map(s => (
                      <option key={s.id} value={s.sku}>{s.sku} - {s.sku}</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const prod = stockList.find(s => s.sku === selectedSku);
                  const sellUnit = prod?.sellUnitOfSale || "Each";
                  const stockUnit = prod?.stockUnitOfSale || "Pallet";
                  return (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Apply to Unit of Sale</label>
                      <select
                        value={ruleUnitOfSale}
                        onChange={(e) => setRuleUnitOfSale(e.target.value as any)}
                        className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                      >
                        <option value="sell">Selling Unit ({sellUnit})</option>
                        <option value="stock">Stocking Unit ({stockUnit})</option>
                      </select>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Min Quantity Threshold (Price Break)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Number(e.target.value))}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">The rule is only active when ordering this number of units or above.</p>
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Formula Modifier Rule</label>
                    <select
                      value={ruleAction}
                      onChange={(e) => setRuleAction(e.target.value as any)}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    >
                      <option value="Fixed Price">Apply Fixed Price (£)</option>
                      <option value="Discount (%)">Apply Discount Percentage (%)</option>
                    </select>
                  </div>
 
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Modifier Value</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    />
                  </div>
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 font-sans flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                    />
                  </div>
                </div>
 
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={status === "Active"}
                      onChange={(e) => setStatus(e.target.checked ? "Active" : "Inactive")}
                      className="w-4 h-4 rounded text-violet-650 focus:ring-violet-500 border-slate-350"
                    />
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-550">Pricing Rule Status Active</span>
                  </label>
                </div>
              </div>
 
              {/* Actions */}
              <div className="flex gap-3 justify-end pt-5 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> 
                  {isCreateMode ? "Create Pricing Rule" : "Save Pricing Rule Specs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getExchangeRate(currencyCode: string) {
  switch (currencyCode) {
    case "GBP": return 1.0;
    case "USD": return 1.25;
    case "EUR": return 1.15;
    default: return 1.0;
  }
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode
  }).format(amount);
}

function getTranslatedName(nameJsonStr: string) {
  try {
    const translations = JSON.parse(nameJsonStr);
    return translations["en-GB"] || nameJsonStr;
  } catch {
    return nameJsonStr;
  }
}
