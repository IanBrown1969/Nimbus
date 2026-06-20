"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { Shield, Sparkles, Building, User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login Form State
  const [subdomain, setSubdomain] = useState("acme");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");

  // Registration Form State
  const [companyName, setCompanyName] = useState("");
  const [regSubdomain, setRegSubdomain] = useState("");
  const [regUsername, setRegUsername] = useState("admin");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("GBP");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        subdomain,
        username,
        password,
      });

      const { token, role, tenantId, tenantName, language, currency, userId } = response.data;
      
      login(token, {
        id: String(userId),
        username,
        role,
        tenantId,
        tenantName,
        language,
        currency,
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        "Failed to connect to Nimbus API. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/register-tenant", {
        subdomain: regSubdomain,
        companyName,
        adminUsername: regUsername,
        adminEmail: regEmail,
        adminPassword: regPassword,
        defaultCurrencyCode: baseCurrency,
        defaultLanguageCode: "en-GB",
      });

      setSuccessMsg(response.data.message + " You can now sign in using your new credentials.");
      setSubdomain(regSubdomain);
      setUsername(regUsername);
      setPassword(regPassword);
      setActiveTab("login");
      
      // Reset registration form
      setCompanyName("");
      setRegSubdomain("");
      setRegEmail("");
      setRegPassword("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        "Failed to register company tenant. Please verify your inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden bg-slate-50">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyan-600/5 blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-2xl mb-4 text-violet-600">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-600 bg-clip-text text-transparent">
            Nimbus ERP
          </h1>
          <p className="text-slate-600 text-sm mt-1">Multi-tenant Cloud Enterprise Administration</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/60 p-1 rounded-2xl border border-slate-300/80 mb-4">
          <button
            onClick={() => {
              setActiveTab("login");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "login"
                ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "register"
                ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Register Company
          </button>
        </div>

        {/* Login & Register Card */}
        <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-slate-850 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            {activeTab === "login" ? "Tenant Authentication" : "Provision New Tenant"}
          </h2>

          {error && (
            <div className="p-4 mb-6 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs">
              {successMsg}
            </div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Tenant Subdomain Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Company Subdomain
                </label>
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  placeholder="e.g. acme, global"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 transition-colors"
                  required
                />
                <p className="text-[10px] text-slate-400">Subdomains: "acme" (UK config) or "global" (US config)</p>
              </div>

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 transition-colors"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 placeholder-slate-400 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? <span>Connecting...</span> : (
                  <>
                    <span>Open Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Apex Distribution Ltd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                  required
                />
              </div>

              {/* Subdomain */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Subdomain
                </label>
                <input
                  type="text"
                  value={regSubdomain}
                  onChange={(e) => setRegSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  placeholder="apex"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                  required
                />
              </div>

              {/* Admin Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Admin Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@apex.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                  required
                />
              </div>

              {/* Base Currency Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  Reporting Currency
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white text-slate-900 text-sm transition-colors"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? <span>Provisioning DB...</span> : (
                  <>
                    <span>Create Company DB</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
