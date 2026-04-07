import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, GitBranch, Briefcase, Users, CalendarCheck,
  LogOut, Sun, Moon, Menu, X, ChevronRight, DollarSign, TrendingUp, Table2,
  FileSignature, Building2, HelpCircle, BookOpen, Vote,
} from "lucide-react";

const MP_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",       path: "/mp/dashboard"      },
  { icon: GitBranch,       label: "Deal Flow",        path: "/mp/deal-flow"      },
  { icon: Vote,            label: "IC Meetings",      path: "/mp/ic-meetings"    },
  { icon: FileSignature,   label: "Term Sheets",      path: "/mp/term-sheet"     },
  { icon: Briefcase,       label: "Portfolio",        path: "/mp/investments"    },
  { icon: HelpCircle,      label: "Founder Asks",     path: "/mp/founder-asks"   },
  { icon: Users,           label: "Limited Partners", path: "/mp/lps"            },
  { icon: DollarSign,      label: "Capital Calls",    path: "/mp/capital-calls"  },
  { icon: BookOpen,        label: "LP Portal",        path: "/mp/lp-portal"      },
  { icon: Building2,       label: "Funds",            path: "/mp/funds"          },
  { icon: Table2,          label: "Cap Table",        path: "/admin/cap-table"   },
  { icon: TrendingUp,      label: "Fund Metrics",     path: "/mp/fund-metrics"   },
  { icon: CalendarCheck,   label: "Advisory",         path: "/mp/advisory"       },
];

const VA_NAV_ITEMS = [
  { icon: GitBranch,     label: "Deal Flow",    path: "/mp/deal-flow"    },
  { icon: Vote,          label: "IC Meetings",  path: "/mp/ic-meetings"  },
  { icon: FileSignature, label: "Term Sheets",  path: "/mp/term-sheet"   },
  { icon: Briefcase,     label: "Portfolio",    path: "/mp/investments"  },
  { icon: HelpCircle,    label: "Founder Asks", path: "/mp/founder-asks" },
  { icon: CalendarCheck, label: "Advisory",     path: "/mp/advisory"     },
];

type NavItemDef = { icon: React.ElementType; label: string; path: string };

function NavItem({ item, currentPath }: { item: NavItemDef; currentPath: string }) {
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
  const { user, logout, role } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const isVA = role === "ventureassociate";
  const navItems = isVA ? VA_NAV_ITEMS : MP_NAV_ITEMS;
  const roleLabel = isVA ? "Venture Associate" : "Managing Partner";
  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "MP";

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">N</span>
          </div>
          <div>
            <span className="font-display font-bold text-sm text-sidebar-foreground">Nobellum</span>
            <div className="text-[10px] text-muted-foreground leading-none">Ventures — {roleLabel}</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden"><X className="h-4 w-4" /></button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} currentPath={location} />
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors" title="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function MPLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden lg:flex lg:flex-col lg:w-64 shrink-0"><Sidebar /></div>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"><Sidebar onClose={() => setMobileOpen(false)} /></div>
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center"><span className="text-white font-bold text-xs">N</span></div>
            <span className="font-display font-bold text-sm">Nobellum Ventures</span>
          </div>
          <div className="w-5" />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
