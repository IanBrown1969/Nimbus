"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface UserProfile {
  id?: string;
  username: string;
  role: string;
  tenantId: string;
  tenantName: string;
  language: string;
  currency: string;
}

interface PluginInfo {
  id: number;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  isSubscribed: boolean;
}

interface AppContextType {
  token: string | null;
  user: UserProfile | null;
  activeLanguage: string;
  activeCurrency: string;
  plugins: PluginInfo[];
  permissions: string[];
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  setLanguage: (lang: string) => void;
  setCurrency: (curr: string) => void;
  layout: "sidebar" | "topnav";
  setLayout: (layout: "sidebar" | "topnav") => void;
  refreshPlugins: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  togglePlugin: (code: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [activeLanguage, setLanguageState] = useState<string>("en-GB");
  const [activeCurrency, setCurrencyState] = useState<string>("GBP");
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [layout, setLayoutState] = useState<"sidebar" | "topnav">("sidebar");

  useEffect(() => {
    // Load from localStorage on mount
    const savedToken = localStorage.getItem("nimbus_token");
    const savedUser = localStorage.getItem("nimbus_user");
    if (savedToken && savedUser) {
      setTokenState(savedToken);
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser) {
        parsedUser.tenantId = String(parsedUser.tenantId);
      }
      setUserState(parsedUser);
      setLanguageState(parsedUser.language || "en-GB");
      setCurrencyState(parsedUser.currency || "GBP");
    }
    const savedLayout = localStorage.getItem("nimbus_layout") as "sidebar" | "topnav" | null;
    if (savedLayout && ["sidebar", "topnav"].includes(savedLayout)) {
      setLayoutState(savedLayout);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshPlugins();
      refreshPermissions();
    } else {
      setPlugins([]);
      setPermissions([]);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserProfile) => {
    const formattedUser = {
      ...newUser,
      tenantId: String(newUser.tenantId)
    };
    setTokenState(newToken);
    setUserState(formattedUser);
    setLanguageState(newUser.language || "en-GB");
    setCurrencyState(newUser.currency || "GBP");
    localStorage.setItem("nimbus_token", newToken);
    localStorage.setItem("nimbus_user", JSON.stringify(formattedUser));
  };

  const logout = () => {
    setTokenState(null);
    setUserState(null);
    setPlugins([]);
    localStorage.removeItem("nimbus_token");
    localStorage.removeItem("nimbus_user");
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    if (user) {
      const updatedUser = { ...user, language: lang, tenantId: String(user.tenantId) };
      setUserState(updatedUser);
      localStorage.setItem("nimbus_user", JSON.stringify(updatedUser));
    }
  };

  const setCurrency = (curr: string) => {
    setCurrencyState(curr);
  };

  const setLayout = (newLayout: "sidebar" | "topnav") => {
    setLayoutState(newLayout);
    localStorage.setItem("nimbus_layout", newLayout);
  };

  const refreshPlugins = async () => {
    if (!token) return;
    try {
      const response = await axios.get("http://localhost:5000/api/plugins", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlugins(response.data);
    } catch (error) {
      console.error("Failed to load plugins:", error);
    }
  };

  const refreshPermissions = async () => {
    if (!token) return;
    try {
      const response = await axios.get("http://localhost:5000/api/rbac/my-permissions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissions(response.data);
    } catch (error) {
      console.error("Failed to load permissions:", error);
    }
  };

  const togglePlugin = async (code: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await axios.post(
        "http://localhost:5000/api/plugins/toggle",
        { pluginCode: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshPlugins();
      return response.data.isSubscribed;
    } catch (error) {
      console.error("Failed to toggle plugin:", error);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        activeLanguage,
        activeCurrency,
        plugins,
        permissions,
        layout,
        setLayout,
        login,
        logout,
        setLanguage,
        setCurrency,
        refreshPlugins,
        refreshPermissions,
        togglePlugin
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
