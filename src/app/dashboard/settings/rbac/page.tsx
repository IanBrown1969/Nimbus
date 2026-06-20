"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Shield, Save, CheckCircle, AlertCircle, Loader2, Lock, Users } from "lucide-react";

interface RolePermissionItem {
  id?: number;
  role: string;
  area: string;
  isAllowed: boolean;
}

interface UserItem {
  id: string | number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLES = ["Accounts", "Warehouse", "Sales", "Integration"];
const ADMIN_ROLES = ["CompanyAdmin", "GlobalAdmin"];
const ALL_ROLES = ["GlobalAdmin", "CompanyAdmin", "Accounts", "Warehouse", "Sales", "Integration"];

const AREAS = [
  { key: "financials", name: "Finance", desc: "General Ledger, Chart of Accounts, VAT Returns" },
  { key: "sales", name: "Sales", desc: "Customers, Quotations, Sales Orders, Credit Notes" },
  { key: "purchasing", name: "Purchasing", desc: "Suppliers, Purchase Orders, Supplier Bills" },
  { key: "banking", name: "Banking", desc: "Bank Feeds, Cash Accounts, Bank Reconciliation" },
  { key: "inventory", name: "Inventory", desc: "Item Master, Bin Locations, Goods In, Shipments" },
  { key: "hr", name: "HR", desc: "Payroll runs, Employee Expense claims" },
  { key: "admin", name: "Admin", desc: "Fixed Assets, Marketplace Add-ons" }
];

export default function RbacSettingsPage() {
  const { token, user, refreshPermissions } = useApp();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"permissions" | "users">("permissions");

  // State arrays
  const [permissions, setPermissions] = useState<RolePermissionItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Loadings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (token && (user?.role === "CompanyAdmin" || user?.role === "GlobalAdmin")) {
      fetchRbacData();
    }
  }, [token, user]);

  const fetchRbacData = async () => {
    setLoading(true);
    try {
      const [permResponse, userResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/rbac", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get("http://localhost:5000/api/rbac/users", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setPermissions(permResponse.data);
      setUsers(userResponse.data);
    } catch (error) {
      console.error("Failed to load RBAC data:", error);
      setMessage({ type: "error", text: "Failed to load permissions matrix or users from API." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (role: string, area: string) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.area === area);
      if (existing) {
        return prev.map(p => p.role === role && p.area === area ? { ...p, isAllowed: !p.isAllowed } : p);
      } else {
        return [...prev, { role, area, isAllowed: true }];
      }
    });
  };

  const isAllowed = (role: string, area: string): boolean => {
    if (ADMIN_ROLES.includes(role)) return true;
    const perm = permissions.find(p => p.role === role && p.area === area);
    return perm ? perm.isAllowed : false;
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = permissions.map(p => ({
        role: p.role,
        area: p.area,
        isAllowed: p.isAllowed
      }));

      await axios.post("http://localhost:5000/api/rbac", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: "success", text: "Permissions matrix updated successfully!" });
      
      await refreshPermissions();

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Failed to save permissions:", error);
      setMessage({ type: "error", text: "Failed to save permissions to database." });
    } finally {
      setSaving(false);
    }
  };

  const handleUserRoleChange = async (userId: string | number, newRole: string) => {
    setMessage(null);
    try {
      await axios.post(
        `http://localhost:5000/api/rbac/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(prev =>
        prev.map(u => (String(u.id) === String(userId) ? { ...u, role: newRole } : u))
      );

      setMessage({
        type: "success",
        text: `Successfully assigned role '${newRole}' to user.`
      });

      if (String(user?.id) === String(userId)) {
        await refreshPermissions();
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error("Failed to update user role:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update user role."
      });
    }
  };

  if (user?.role !== "CompanyAdmin" && user?.role !== "GlobalAdmin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-10 max-w-md w-full text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight font-heading">
            Unauthorized Settings Access
          </h3>
          <p className="text-slate-550 text-xs mt-3 leading-relaxed">
            Only Company Administrators or Global Administrators can view or manage Role-Based Access Control (RBAC) settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-655 uppercase tracking-widest font-heading">Administration</span>
          <h2 className="text-3xl font-bold font-heading text-slate-900">Role-Based Access Control</h2>
          <p className="text-slate-600 text-sm mt-1">Configure screen access permissions and assign roles to user logins inside the tenant system.</p>
        </div>
        {activeTab === "permissions" && (
          <button
            onClick={handleSavePermissions}
            disabled={loading || saving}
            className="py-3 px-5 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 flex items-center justify-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-55 cursor-pointer self-start md:self-auto"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Saving Changes..." : "Save Permissions Matrix"}</span>
          </button>
        )}
      </div>

      {/* Tab controls */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("permissions");
            setMessage(null);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "permissions"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          } mr-8`}
        >
          Role Permissions Matrix
        </button>
        <button
          onClick={() => {
            setActiveTab("users");
            setMessage(null);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "users"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          User Role Assignments
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          message.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <span>Loading RBAC setup details...</span>
        </div>
      ) : activeTab === "permissions" ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-4 px-6 w-1/3">System Area / Module</th>
                  {ROLES.map(role => (
                    <th key={role} className="py-4 px-4 text-center">{role}</th>
                  ))}
                  {ADMIN_ROLES.map(role => (
                    <th key={role} className="py-4 px-4 text-center text-violet-600 bg-violet-50/20">{role} *</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {AREAS.map(area => (
                  <tr key={area.key} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4.5 px-6">
                      <span className="block font-bold text-slate-800 text-xs">{area.name}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5 font-medium leading-relaxed">{area.desc}</span>
                    </td>
                    
                    {ROLES.map(role => {
                      const checked = isAllowed(role, area.key);
                      return (
                        <td key={role} className="py-4.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center p-1.5 cursor-pointer hover:bg-slate-100/80 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
                              checked={checked}
                              onChange={() => handleToggle(role, area.key)}
                            />
                          </label>
                        </td>
                      );
                    })}

                    {ADMIN_ROLES.map(role => (
                      <td key={role} className="py-4.5 px-4 text-center bg-violet-50/10">
                        <label className="inline-flex items-center justify-center p-1.5 opacity-65 cursor-not-allowed">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-violet-650 border-slate-300 focus:ring-violet-500 cursor-not-allowed bg-slate-100"
                            checked={true}
                            disabled={true}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50/60 p-5 border-t border-slate-100 flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-violet-600 shrink-0" />
            <p className="text-[10px] text-slate-550 leading-relaxed">
              * Administrator roles (<strong className="text-slate-700">CompanyAdmin</strong> and <strong className="text-slate-700">GlobalAdmin</strong>) are locked to absolute system access to prevent administrative lockouts.
              Changes saved will be reflected immediately on next load or menu refresh.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-4 px-6 w-1/3">User Login</th>
                  <th className="py-4 px-4">Email Address</th>
                  <th className="py-4 px-4 w-1/4">Assigned Role</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {users.map(u => {
                  const isSelf = String(user?.id) === String(u.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4.5 px-6 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="block">{u.username}</span>
                          {isSelf && (
                            <span className="inline-block text-[8px] font-bold text-violet-650 bg-violet-50 border border-violet-200 px-1 py-0.2 rounded uppercase mt-0.5">Current User</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4.5 px-4 font-mono text-[11px]">{u.email}</td>
                      <td className="py-4.5 px-4">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                          className={`w-full py-1.5 px-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-violet-500 text-xs font-semibold cursor-pointer ${
                            isSelf 
                              ? "border-slate-200 text-slate-405 bg-slate-100 cursor-not-allowed" 
                              : "border-slate-250 text-slate-700 hover:border-slate-350"
                          }`}
                        >
                          {ALL_ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          u.isActive 
                            ? "bg-emerald-50 border border-emerald-250 text-emerald-700" 
                            : "bg-slate-100 border border-slate-200 text-slate-500"
                        }`}>
                          {u.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50/60 p-5 border-t border-slate-100 flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-violet-600 shrink-0" />
            <p className="text-[10px] text-slate-550 leading-relaxed">
              Assigning a new role to a user login immediately adjusts their layout access privileges and screen lockouts.
              Administrators are blocked from self-demoting to prevent lockout scenarios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
