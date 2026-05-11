import { useEffect, useState } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, TrendingUp, Briefcase, Users, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function LPDashboard() {
  return (
    <ProtectedRoute lpOnly>
      <LPLayout>
        <LPDashboardInner />
      </LPLayout>
    </ProtectedRoute>
  );
}

function LPDashboardInner() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/lp/portfolio`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/api/lp/founders`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([portfolio, founders]) => {
      setData({ portfolio: portfolio?.portfolio || [], summary: portfolio?.summary || {}, founders: founders?.founders || [] });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const stats = [
    { label: "Portfolio Companies", value: data?.summary?.totalCompanies ?? 0, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Deployed (CAD)", value: data?.summary?.totalDeployedCad > 0 ? `$${Number(data.summary.totalDeployedCad).toLocaleString()}` : "—", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Founders", value: data?.founders?.length ?? 0, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display">LP Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to your Startling Capital Ventures investor portal.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Portfolio Highlights</CardTitle>
            <button onClick={() => navigate("/lp/portfolio")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {data?.portfolio?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No portfolio data available yet.</p>
          ) : (
            <div className="space-y-2">
              {data.portfolio.slice(0, 6).map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inv.startupName}</p>
                    <p className="text-xs text-muted-foreground">{[inv.sector, inv.stage, inv.country].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50 border text-xs dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50">{inv.instrument}</Badge>
                  {inv.amountCad && <span className="text-xs font-medium text-foreground">CAD {Number(inv.amountCad).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

