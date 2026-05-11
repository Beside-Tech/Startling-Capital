import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter, useGetMe, UserInfo, AllowedAssignment } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface AuthState {
  token: string | null;
  role: string | null;
  user: UserInfo | null;
  allowedAssignments: AllowedAssignment[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: string, user: UserInfo, allowedAssignments: AllowedAssignment[]) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("auth_role");
    const userStr = localStorage.getItem("auth_user");
    const user = userStr ? JSON.parse(userStr) : null;
    const allowedStr = localStorage.getItem("auth_assignments");
    const allowedAssignments = allowedStr ? JSON.parse(allowedStr) : [];

    return {
      token,
      role,
      user,
      allowedAssignments,
      isAuthenticated: !!token,
      isLoading: true,
    };
  });

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_assignments");
    setAuthTokenGetter(() => null);
    setState({
      token: null,
      role: null,
      user: null,
      allowedAssignments: [],
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const { data, isLoading, error } = useGetMe({
    query: {
      enabled: !!state.token,
      retry: false,
    } as any
  });

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("auth_token"));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (error || !data) {
        if (state.token) {
          logout();
        } else {
          setState(s => ({ ...s, isLoading: false }));
        }
      } else {
        setState(s => ({
          ...s,
          user: data.user,
          allowedAssignments: data.allowedAssignments,
          isLoading: false,
        }));
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        localStorage.setItem("auth_assignments", JSON.stringify(data.allowedAssignments));
      }
    }
  }, [data, isLoading, error]);

  const login = (token: string, role: string, user: UserInfo, allowedAssignments: AllowedAssignment[]) => {
    const normalizedRole = role.toLowerCase();
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_role", normalizedRole);
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("auth_assignments", JSON.stringify(allowedAssignments));
    setAuthTokenGetter(() => token);
    setState({
      token,
      role: normalizedRole,
      user,
      allowedAssignments,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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

export function isAdminRole(role: string | null) {
  return role === "admin" || role === "superadmin";
}

export function isICRole(role: string | null) {
  return role === "ic" || role === "managingpartner" || role === "superadmin";
}

export function isLPRole(role: string | null) {
  return role === "lp" || role === "managingpartner" || role === "superadmin";
}

export function isManagingPartnerRole(role: string | null) {
  return role === "managingpartner" || role === "superadmin";
}

export function getDefaultRoute(role: string | null): string {
  if (!role) return "/login";
  if (isAdminRole(role)) return "/admin/dashboard";
  if (role === "founder") return "/founder/dashboard";
  if (role === "judge") return "/score";
  if (isManagingPartnerRole(role)) return "/mp/dashboard";
  if (isICRole(role)) return "/ic/dashboard";
  if (isLPRole(role)) return "/lp/dashboard";
  return "/login";
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold font-display">N</span>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  adminOnly = false,
  founderOnly = false,
  superAdminOnly = false,
  icOnly = false,
  lpOnly = false,
  mpOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  founderOnly?: boolean;
  superAdminOnly?: boolean;
  icOnly?: boolean;
  lpOnly?: boolean;
  mpOnly?: boolean;
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      const dest = getDefaultRoute(role);
      if (superAdminOnly && role !== "superadmin") { setLocation(dest); return; }
      if (adminOnly && !isAdminRole(role)) { setLocation(dest); return; }
      if (founderOnly && role !== "founder") { setLocation(dest); return; }
      if (icOnly && !isICRole(role)) { setLocation(dest); return; }
      if (lpOnly && !isLPRole(role)) { setLocation(dest); return; }
      if (mpOnly && !isManagingPartnerRole(role)) { setLocation(dest); return; }
    }
  }, [isAuthenticated, isLoading, role, adminOnly, founderOnly, superAdminOnly, icOnly, lpOnly, mpOnly, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return null;
  if (superAdminOnly && role !== "superadmin") return null;
  if (adminOnly && !isAdminRole(role)) return null;
  if (founderOnly && role !== "founder") return null;
  if (icOnly && !isICRole(role)) return null;
  if (lpOnly && !isLPRole(role)) return null;
  if (mpOnly && !isManagingPartnerRole(role)) return null;

  return <>{children}</>;
}