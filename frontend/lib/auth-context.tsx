"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "./api-client";
import type { User, Tenant } from "./types";

interface AuthContextType {
  user: User | null;
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenant: Tenant) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token on mount and fetch user data
    const initAuth = async () => {
      const token = apiClient.getAccessToken();
      if (token) {
        try {
          // Fetch user data from /auth/me endpoint
          const response = await fetch("http://localhost:8000/api/v1/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser({
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
            });
            setCurrentTenant({
              id: userData.tenant_id,
              name: userData.tenant_name,
              slug: "",
              role: userData.role,
            });
          } else {
            // Token invalid, clear it
            apiClient.clearTokens();
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          apiClient.clearTokens();
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      apiClient.setAccessToken(response.access_token);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_token", response.refresh_token);
      }

      // Fetch user data
      const userResponse = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${response.access_token}`,
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
        });
        setCurrentTenant({
          id: userData.tenant_id,
          name: userData.tenant_name,
          slug: "",
          role: userData.role,
        });
        
        // Fetch all tenants
        const tenantsData = await apiClient.listTenants();
        setTenants(tenantsData);
      }

      router.push("/app");
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await apiClient.register(email, password, fullName);
      apiClient.setAccessToken(response.access_token);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_token", response.refresh_token);
      }

      // Fetch user data
      const userResponse = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${response.access_token}`,
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
        });
        setCurrentTenant({
          id: userData.tenant_id,
          name: userData.tenant_name,
          slug: "",
          role: userData.role,
        });
      }

      router.push("/app");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiClient.clearTokens();
    setUser(null);
    setCurrentTenant(null);
    setTenants([]);
    router.push("/login");
  };

  const switchTenant = async (tenant: Tenant) => {
    setCurrentTenant(tenant);

    const refreshToken =
      typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

    if (!refreshToken) {
      // No refresh token means we can't safely switch tenant context.
      logout();
      return;
    }

    try {
      const response = await apiClient.refreshToken(refreshToken, tenant.id);
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== "undefined") {
        localStorage.setItem("refresh_token", response.refresh_token);
        localStorage.setItem("current_tenant_id", String(tenant.id));
      }

      // Re-fetch user + tenant context based on the new token
      const meResponse = await fetch("http://localhost:8000/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${response.access_token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error("Failed to refresh tenant context");
      }

      const userData = await meResponse.json();
      setUser({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
      });
      setCurrentTenant({
        id: userData.tenant_id,
        name: userData.tenant_name,
        slug: "",
        role: userData.role,
      });
    } catch (error) {
      console.error("Failed to switch tenant:", error);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentTenant,
        tenants,
        isLoading,
        login,
        register,
        logout,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

