"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import GoldenArrow from "@/components/common/GoldenArrow";
import { 
  Users, 
  MapPin, 
  Plus, 
  Mail, 
  Phone as PhoneIcon, 
  Coins, 
  RefreshCw,
  Search,
  CheckCircle,
  Building,
  Globe,
  Trash2,
  X,
  Edit2
} from "lucide-react";

interface AddressInput {
  addressName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryId: number | "";
  addressType: "Billing" | "Shipping";
  isDefault: boolean;
}

export default function CustomersPage() {
  const { token, user } = useApp();

  const [customers, setCustomers] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [selectedCountryId, setSelectedCountryId] = useState<number | "">("");
  const [addresses, setAddresses] = useState<AddressInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Selected customer for View/Edit drawer
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editCountryId, setEditCountryId] = useState<number | "">("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Add Address inside drawer states
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrLine2, setNewAddrLine2] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");
  const [newAddrCountryId, setNewAddrCountryId] = useState<number | "">("");
  const [newAddrType, setNewAddrType] = useState<"Billing" | "Shipping">("Billing");
  const [newAddrDefault, setNewAddrDefault] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    if (token) {
      fetchCustomers();
      fetchCountries();
    }
  }, [token]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
      
      // If drawer is open, update selected customer details with fresh data
      if (selectedCustomer) {
        const fresh = res.data.find((c: any) => c.id === selectedCustomer.id);
        if (fresh) {
          setSelectedCustomer(fresh);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/finance/countries", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCountries(res.data);
    } catch (err) {
      console.error("Failed to load countries", err);
    }
  };

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setEditName(c.name || "");
    setEditCompanyName(c.companyName || "");
    setEditEmail(c.email || "");
    setEditPhone(c.phone || "");
    setEditCurrency(c.defaultCurrencyCode || "GBP");
    setEditCountryId(c.countryId || "");
    setEditIsActive(c.isActive !== false);

    // Reset drawer address states
    setNewAddrName("");
    setNewAddrLine1("");
    setNewAddrLine2("");
    setNewAddrCity("");
    setNewAddrState("");
    setNewAddrPostal("");
    setNewAddrCountryId("");
    setNewAddrType("Billing");
    setNewAddrDefault(false);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setUpdating(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/customers/${selectedCustomer.id}`, {
        name: editName,
        companyName: editCompanyName,
        email: editEmail,
        phone: editPhone,
        defaultCurrencyCode: editCurrency,
        countryId: editCountryId === "" ? null : Number(editCountryId),
        isActive: editIsActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Customer profile successfully updated!");
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update customer.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddDrawerAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setAddingAddress(true);
    setError(null);
    try {
      await axios.post(`http://localhost:5000/api/customers/${selectedCustomer.id}/addresses`, {
        addressName: newAddrName,
        addressLine1: newAddrLine1,
        addressLine2: newAddrLine2 === "" ? null : newAddrLine2,
        city: newAddrCity,
        state: newAddrState === "" ? null : newAddrState,
        postalCode: newAddrPostal,
        countryId: newAddrCountryId === "" ? null : Number(newAddrCountryId),
        addressType: newAddrType,
        isDefault: newAddrDefault
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNewAddrName("");
      setNewAddrLine1("");
      setNewAddrLine2("");
      setNewAddrCity("");
      setNewAddrState("");
      setNewAddrPostal("");
      setNewAddrCountryId("");
      setNewAddrType("Billing");
      setNewAddrDefault(false);
      
      alert("Address successfully added!");
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add address.");
    } finally {
      setAddingAddress(false);
    }
  };

  const handleAddAddressRow = () => {
    setAddresses(prev => [
      ...prev,
      {
        addressName: `Address #${prev.length + 1}`,
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        countryId: "",
        addressType: "Billing",
        isDefault: prev.filter(a => a.addressType === "Billing").length === 0
      }
    ]);
  };

  const handleRemoveAddressRow = (index: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddressChange = (index: number, field: keyof AddressInput, value: any) => {
    setAddresses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as AddressInput;
      if (field === "isDefault" && value === true) {
        const targetType = updated[index].addressType;
        updated.forEach((addr, i) => {
          if (i !== index && addr.addressType === targetType) {
            addr.isDefault = false;
          }
        });
      }
      return updated;
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        companyName,
        email,
        phone,
        defaultCurrencyCode: currency,
        countryId: selectedCountryId === "" ? null : Number(selectedCountryId),
        addresses: addresses.map(a => ({
          ...a,
          countryId: a.countryId === "" ? null : Number(a.countryId)
        }))
      };

      await axios.post("http://localhost:5000/api/customers", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddModal(false);
      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setCurrency("GBP");
      setSelectedCountryId("");
      setAddresses([]);
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.customerRef.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold text-violet-650 uppercase tracking-widest font-heading">Sales - A/R</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Customer Directory</h2>
          <p className="text-slate-655 text-sm mt-1">Manage customer profile master cards, default currencies, and addresses in a searchable grid.</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchCustomers}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {(user?.role === "CompanyAdmin" || user?.role === "Sales" || user?.role === "GlobalAdmin") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md flex items-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Define New Customer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Ref, Name, or Company..."
          className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 shadow-sm"
        />
      </div>

      {/* Main Customers Searchable Grid (Table) */}
      {loading ? (
        <div className="text-slate-500 text-xs text-center py-10">Loading customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-10">No customer records match your filter criteria.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/75">
                <th className="py-3.5 px-5">Ref</th>
                <th className="py-3.5 px-5">Contact Name</th>
                <th className="py-3.5 px-5">Company Name</th>
                <th className="py-3.5 px-5">Email</th>
                <th className="py-3.5 px-5">Phone</th>
                <th className="py-3.5 px-5">Currency</th>
                <th className="py-3.5 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  onClick={() => handleSelectCustomer(customer)}
                  className="hover:bg-slate-50/65 text-slate-700 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-5 font-mono font-bold text-cyan-750 flex items-center gap-1.5">
                    <span>{customer.customerRef}</span>
                    <GoldenArrow type="customer" id={customer.customerRef} />
                  </td>
                  <td className="py-3 px-5 font-semibold text-slate-900">{customer.name}</td>
                  <td className="py-3 px-5">{customer.companyName}</td>
                  <td className="py-3 px-5 font-mono text-slate-600">{customer.email}</td>
                  <td className="py-3 px-5 text-slate-600">{customer.phone}</td>
                  <td className="py-3 px-5 text-center font-bold text-slate-600">{customer.defaultCurrencyCode}</td>
                  <td className="py-3 px-5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${customer.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                      {customer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Define New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl max-h-[90vh] p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-5 overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-650" /> Define New Customer Record
            </h3>
            
            <form onSubmit={handleCreateCustomer} className="space-y-6">
              {/* Profile Details */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Customer Profile</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Contact / Contact Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Construction Ltd"
                      className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@construction.com"
                      className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0121 445 9898"
                      className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Default Currency</label>
                    <input
                      type="text"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Billing Country</label>
                  <select
                    value={selectedCountryId}
                    onChange={(e) => setSelectedCountryId(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    className="w-full mt-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 text-slate-800"
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiple Addresses list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Addresses Directory</h4>
                  <button
                    type="button"
                    onClick={handleAddAddressRow}
                    className="py-1 px-3 bg-violet-50 hover:bg-violet-100 text-violet-750 text-[10px] font-bold rounded border border-violet-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    No billing or shipping addresses added yet. Click 'Add Address' above.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
                    {addresses.map((addr, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveAddressRow(idx)}
                          className="absolute top-3 right-3 p-1.5 hover:bg-rose-50 text-rose-600 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Address Label</label>
                            <input
                              type="text"
                              required
                              value={addr.addressName}
                              onChange={(e) => handleAddressChange(idx, "addressName", e.target.value)}
                              placeholder="e.g. London Office, Depot 2"
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Address Type</label>
                            <select
                              value={addr.addressType}
                              onChange={(e) => handleAddressChange(idx, "addressType", e.target.value)}
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            >
                              <option value="Billing">Billing Address</option>
                              <option value="Shipping">Shipping Address</option>
                            </select>
                          </div>
                          <div className="flex items-center pt-5 pl-2">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                              <input
                                type="checkbox"
                                checked={addr.isDefault}
                                onChange={(e) => handleAddressChange(idx, "isDefault", e.target.checked)}
                                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-350"
                              />
                              <span>Set Default</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 1</label>
                            <input
                              type="text"
                              required
                              value={addr.addressLine1}
                              onChange={(e) => handleAddressChange(idx, "addressLine1", e.target.value)}
                              placeholder="50 Works Way"
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              value={addr.addressLine2}
                              onChange={(e) => handleAddressChange(idx, "addressLine2", e.target.value)}
                              placeholder="Suite 3"
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">City</label>
                            <input
                              type="text"
                              required
                              value={addr.city}
                              onChange={(e) => handleAddressChange(idx, "city", e.target.value)}
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">State / County</label>
                            <input
                              type="text"
                              value={addr.state}
                              onChange={(e) => handleAddressChange(idx, "state", e.target.value)}
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Postal Code</label>
                            <input
                              type="text"
                              required
                              value={addr.postalCode}
                              onChange={(e) => handleAddressChange(idx, "postalCode", e.target.value)}
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500">Country</label>
                            <select
                              value={addr.countryId}
                              onChange={(e) => handleAddressChange(idx, "countryId", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full mt-0.5 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                            >
                              <option value="">Same as Billing</option>
                              {countries.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setName("");
                    setCompanyName("");
                    setEmail("");
                    setPhone("");
                    setAddresses([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-750 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Customer View / Edit Slide-over Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest block font-mono">{selectedCustomer.customerRef}</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-violet-650" /> {selectedCustomer.name} Profile
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Details Edit Form */}
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Edit2 className="w-3.5 h-3.5 text-violet-600" /> Core Specifications
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Contact Person Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Default Currency</label>
                  <input
                    type="text"
                    required
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Billing Country</label>
                  <select
                    value={editCountryId}
                    onChange={(e) => setEditCountryId(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    className="w-full mt-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-violet-500 text-slate-800"
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-650 focus:ring-violet-500 border-slate-350"
                  />
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-550">Active Partner Status</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {updating ? "Saving Changes..." : "Save Customer Specifications"}
              </button>
            </form>

            {/* View Address Directories */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-600" /> Active Address Directories
              </h4>
              <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                {selectedCustomer.addresses?.length === 0 ? (
                  <span className="text-slate-400 italic text-[11px] col-span-2">No addresses defined for this customer.</span>
                ) : (
                  selectedCustomer.addresses?.map((addr: any) => (
                    <div key={addr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5 text-[10px] text-slate-700">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{addr.addressName} ({addr.addressType})</span>
                        {addr.isDefault && <span className="text-[8px] font-extrabold bg-violet-100 text-violet-750 px-1 py-0.2 rounded uppercase">Default</span>}
                      </div>
                      <span className="block text-slate-600">{addr.addressLine1} {addr.addressLine2 && `, ${addr.addressLine2}`}</span>
                      <span className="block text-slate-650">{addr.city}, {addr.postalCode}</span>
                      {addr.country && <span className="block text-slate-500 font-semibold">{addr.country.name}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add Address Form */}
            <form onSubmit={handleAddDrawerAddress} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="block text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-violet-650" /> Add Address to Directory
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Label</label>
                  <input
                    type="text"
                    required
                    value={newAddrName}
                    onChange={(e) => setNewAddrName(e.target.value)}
                    placeholder="Head Office"
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Type</label>
                  <select
                    value={newAddrType}
                    onChange={(e) => setNewAddrType(e.target.value as any)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  >
                    <option value="Billing">Billing Address</option>
                    <option value="Shipping">Shipping Address</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Address Line 1</label>
                  <input
                    type="text"
                    required
                    value={newAddrLine1}
                    onChange={(e) => setNewAddrLine1(e.target.value)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Line 2</label>
                  <input
                    type="text"
                    value={newAddrLine2}
                    onChange={(e) => setNewAddrLine2(e.target.value)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">City</label>
                  <input
                    type="text"
                    required
                    value={newAddrCity}
                    onChange={(e) => setNewAddrCity(e.target.value)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">State</label>
                  <input
                    type="text"
                    value={newAddrState}
                    onChange={(e) => setNewAddrState(e.target.value)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Post Code</label>
                  <input
                    type="text"
                    required
                    value={newAddrPostal}
                    onChange={(e) => setNewAddrPostal(e.target.value)}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Country</label>
                  <select
                    value={newAddrCountryId}
                    onChange={(e) => setNewAddrCountryId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full mt-0.5 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-800"
                  >
                    <option value="">Same as Billing</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 text-[10px] select-none">
                  <input
                    type="checkbox"
                    checked={newAddrDefault}
                    onChange={(e) => setNewAddrDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-violet-600"
                  />
                  <span>Set as Default Address</span>
                </label>
                <button
                  type="submit"
                  disabled={addingAddress}
                  className="py-1 px-3 bg-cyan-600 hover:bg-cyan-550 text-white font-semibold rounded text-[10px] disabled:opacity-50 cursor-pointer"
                >
                  {addingAddress ? "Adding..." : "Add to Directory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
