"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  companyName: string;
  creditContractDays: number;
  defaultCurrencyCode: string;
}

interface SearchableCustomerDropdownProps {
  customers: Customer[];
  value: string;
  onChange: (customerName: string, customer?: Customer) => void;
  placeholder?: string;
}

export default function SearchableCustomerDropdown({
  customers,
  value,
  onChange,
  placeholder = "Search customer...",
}: SearchableCustomerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync searchQuery with external value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value);
    }
  }, [value, isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.companyName.toLowerCase().includes(query)
    );
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchQuery(newVal);
    // Also notify parent of the typing value
    onChange(newVal);
  };

  const handleSelectCustomer = (c: Customer) => {
    onChange(c.name, c);
    setSearchQuery(c.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#00b7e2] text-slate-800 pr-8"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-slate-655"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {filteredCustomers.length === 0 ? (
            <div className="p-3 text-slate-400 text-xs italic">
              No matching customers found. Press Enter to use "{searchQuery}".
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredCustomers.map((customer) => {
                const isSelected = customer.name === value;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full text-left text-xs px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-[#00b7e2]/10 text-[#009dc4] font-semibold"
                        : "hover:bg-slate-55/75 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{customer.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {customer.companyName} &bull; Net {customer.creditContractDays} Days &bull; {customer.defaultCurrencyCode}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#009dc4]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
