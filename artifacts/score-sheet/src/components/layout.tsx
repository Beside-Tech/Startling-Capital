import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Play,
  Download,
  LogOut,
  CheckSquare,
  Settings,
  MessageSquare,
  Home,
  FileText,
  BookOpen,
  TrendingUp,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { isAdminRole } from "@/lib/auth";

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation("/login");
      },
    });
  };

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const navLink = (href: string, label: string, Icon: React.ElementType) => (
    <li key={href}>
      <Link href={href}>
        <span
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive(href)
              ? "bg-primary/10 text-primary"
              : "hover:bg-accent text-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b gap-2">
          <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <div>
            <div className="font-display font-bold text-sm text-foreground leading-none">Nobellum</div>
            <div className="text-[9px] text-muted-foreground font-medium tracking-wide">PROGRAMS</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-3">
            {role === "judge" && (
              <>
                <div className="px-3 mb-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Judge
                </div>
                {navLink("/score", "Score Startups", CheckSquare)}
              </>
            )}

            {isAdminRole(role) && (
              <>
                <div className="px-3 mb-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overview
                </div>
                {navLink("/admin/dashboard", "Dashboard", LayoutDashboard)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Programs
                </div>
                {navLink("/admin/manage", "Manage Programs", FileText)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Scoring
                </div>
                {navLink("/admin/advance", "Advancement", Play)}
                {navLink("/admin/export", "Export Scores", Download)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Learning
                </div>
                {navLink("/admin/curriculum", "Curriculum", BookOpen)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Portfolio
                </div>
                {navLink("/admin/traction", "Traction Dashboard", TrendingUp)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nobellum Ventures
                </div>
                {navLink("/admin/ventures", "Portfolio", Briefcase)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Community
                </div>
                {navLink("/admin/founders", "Founders", Users)}
                {navLink("/admin/testimonials", "Testimonials", MessageSquare)}

                <div className="px-3 mb-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configuration
                </div>
                {navLink("/admin/settings", "Site Settings", Settings)}

                {role === "superadmin" && (
                  <>
                    <div className="px-3 mb-2 mt-4 text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Team & Access
                    </div>
                    {navLink("/admin/users", "User Management", ShieldCheck)}
                  </>
                )}
              </>
            )}

            {role === "founder" && (
              <>
                <div className="px-3 mb-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Founder
                </div>
                {navLink("/founder/dashboard", "My Dashboard", Home)}
              </>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm truncate pr-2">
              <p className="font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
