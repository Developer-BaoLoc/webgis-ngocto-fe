"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getMe, login as loginApi } from "@/lib/api/auth";
import { getCurrentTenant } from "@/lib/api/tenants";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth/token";
import { ApiError } from "@/lib/api/client";
import type { AuthUser, LoginRequest } from "@/types/api/auth";
import type { Tenant } from "@/types/api/tenant";

interface AuthContextValue {
  user: AuthUser | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async (token: string) => {
    const [me, currentTenant] = await Promise.all([
      getMe(token),
      getCurrentTenant(token),
    ]);
    setUser(me);
    setTenant(currentTenant);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    loadSession(token)
      .catch(() => {
        clearStoredToken();
        setUser(null);
        setTenant(null);
      })
      .finally(() => setIsLoading(false));
  }, [loadSession]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await loginApi(credentials);
      setStoredToken(result.accessToken);
      setUser(result.user);

      try {
        const currentTenant = await getCurrentTenant(result.accessToken);
        setTenant(currentTenant);
      } catch {
        setTenant(null);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setTenant(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Đăng nhập thất bại";
}
