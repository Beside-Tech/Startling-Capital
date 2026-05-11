import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard,
  FileText,
  Database,
  MessageSquare,
  Star,
  User,
  LogOut,
  Sun,
  Moon,
  HelpCircle,
  Menu,
  X,
  Rocket,
  ExternalLink,
  Bell,
  ChevronRight,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/founder/dashboard" },
  { icon: Rocket, label: "Apply to Program", path: "/founder/apply" },
  { icon: GraduationCap, label: "My Courses", path: "/founder/courses" },
  { icon: TrendingUp, label: "Traction Check-in", path: "/founder/traction" },
  { icon: FileText, label: "My Applications", path: "/founder/applications" },
  { icon: Database, label: "Data Room", path: "/founder/data-room" },
  { icon: MessageSquare, label: "Q&A", path: "/founder/qa" },
  { icon: ExternalLink, label: "Advisory Services", path: "/founder/advisory" },
  { icon: HelpCircle,   label: "My Asks",           path: "/founder/asks"     },
  { icon: User,         label: "My Profile",         path: "/founder/profile"  },
];

function NavItem({ item, currentPath }: { item: typeof NAV_ITEMS[number]; currentPath: string }) {
  const [, navigate] = useLocation();
  const isActive = currentPath === item.path;

  return (
    <button
      onClick={() => navigate(item.path)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        isActive
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
    </button>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "F";

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">S</span>
          </div>
          <div>
            <span className="font-display font-bold text-sm text-sidebar-foreground">Startling Capital</span>
            <div className="text-[10px] text-muted-foreground leading-none">Founder Portal</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} currentPath={location} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        {/* Notification hint */}
        <div className="bg-accent/60 border border-accent rounded-xl p-3 mb-3">
          <div className="flex gap-2">
            <Bell className="h-3.5 w-3.5 text-accent-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-accent-foreground leading-relaxed">
              Update your data room quarterly for investor readiness.
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FounderLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-display font-bold text-sm">Startling Capital</span>
          </div>
          <div className="w-5" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


