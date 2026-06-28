import { createContext, useCallback, useContext, useEffect, useState } from "react";

const API = `${import.meta.env.VITE_API_URL as string}/auth`;

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "manager" | "worker";
  company: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (firstName: string, lastName: string, email: string, password: string, role?: "manager" | "worker") => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<AuthUser, "firstName" | "lastName" | "company">>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("st_token"));
  const [loading, setLoading] = useState(true);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data;
    },
    [token]
  );

  // Validate stored token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch("/me")
      .then((u: AuthUser) => setUser(u))
      .catch(() => {
        localStorage.removeItem("st_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (tok: string, u: AuthUser) => {
    localStorage.setItem("st_token", tok);
    setToken(tok);
    setUser(u);
  };

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const data = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Login failed");
      return d;
    });
    persist(data.token, data.user);
    return data.user as AuthUser;
  };

  const register = async (firstName: string, lastName: string, email: string, password: string, role: "manager" | "worker" = "manager") => {
    const data = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password, role }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Registration failed");
      return d;
    });
    persist(data.token, data.user);
  };

  const logout = () => {
    localStorage.removeItem("st_token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<Pick<AuthUser, "firstName" | "lastName" | "company">>) => {
    const tok = localStorage.getItem("st_token");
    const res = await fetch(`${API}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to update profile");
    setUser(json);
  };

  const changePassword = async (newPassword: string) => {
    const tok = localStorage.getItem("st_token");
    const res = await fetch(`${API}/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to change password");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
