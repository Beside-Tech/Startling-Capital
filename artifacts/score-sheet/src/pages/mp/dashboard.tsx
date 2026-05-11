import { useEffect, useState } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Briefcase, GitBranch, Users, DollarSign, TrendingUp, ArrowRight, Loader2, CalendarCheck,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function MPDashboard() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <MPDashboardInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function MPDashboardInner() {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/mp/dashboard`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const statCards = [
    { label: "Portfolio Companies", value: stats?.portfolio?.founders ?? 0, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50", route: "/mp/investments" },
    { label: "Total Deployed (CAD)", value: stats?.investments?.deployedCad > 0 ? `$${Number(stats.investments.deployedCad).toLocaleString()}` : "—", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50", route: "/mp/investments" },
    { label: "Active Deals", value: stats?.deals?.total ?? 0, icon: GitBranch, color: "text-violet-600", bg: "bg-violet-50", route: "/mp/deal-flow" },
    { label: "IC Review", value: stats?.deals?.icReview ?? 0, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", route: "/mp/deal-flow" },
    { label: "Active LPs", value: stats?.lps?.total ?? 0, icon: Users, color: "text-pink-600", bg: "bg-pink-50", route: "/mp/lps" },
    { label: "LP Committed (CAD)", value: stats?.lps?.committedCad > 0 ? `$${Number(stats.lps.committedCad).toLocaleString()}` : "—", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", route: "/mp/lps" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display">Managing Partner Dashboard</h1>
        <p className="text-muted-foreground mt-1">Startling Capital Ventures — full portfolio and deal flow overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(s.route)}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Deal Flow Snapshot</CardTitle>
              <button onClick={() => navigate("/mp/deal-flow")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {[
                { stage: "sourced", label: "Sourced", color: "bg-gray-500" },
                { stage: "screening", label: "Screening", color: "bg-blue-500" },
                { stage: "due_diligence", label: "Due Diligence", color: "bg-amber-500" },
                { stage: "ic_review", label: "IC Review", color: "bg-violet-500" },
                { stage: "term_sheet", label: "Term Sheet", color: "bg-green-500" },
              ].map(row => (
                <div key={row.stage} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.color}`} />
                    <span className="text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="font-medium">—</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />Advisory Queue</CardTitle>
              <button onClick={() => navigate("/mp/advisory")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">Manage advisory session requests from founders.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

