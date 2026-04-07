import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Users, Briefcase, GitBranch, Star } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function MPFundMetrics() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <MPFundMetricsInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function MPFundMetricsInner() {
  const [stats, setStats] = useState<any>(null);
  const [ventures, setVentures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/mp/dashboard`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/api/mp/investments`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([s, v]) => {
      setStats(s);
      setVentures(Array.isArray(v) ? v : v?.founders ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const totalDeployed = stats?.investments?.deployedCad ?? 0;
  const totalLPCommitted = stats?.lps?.committedCad ?? 0;
  const utilizationRate = totalLPCommitted > 0 ? ((totalDeployed / totalLPCommitted) * 100).toFixed(1) : null;
  const avgScore = ventures.filter(v => v.score).reduce((s: number, v: any, _: any, arr: any[]) => s + Number(v.score) / arr.length, 0);

  const kpis = [
    { label: "Portfolio Companies", value: stats?.portfolio?.founders ?? 0, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Deals", value: stats?.deals?.total ?? 0, icon: GitBranch, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Total Deployed (CAD)", value: totalDeployed > 0 ? `$${Number(totalDeployed).toLocaleString()}` : "—", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "LP Committed (CAD)", value: totalLPCommitted > 0 ? `$${Number(totalLPCommitted).toLocaleString()}` : "—", icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Capital Utilization", value: utilizationRate ? `${utilizationRate}%` : "—", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Avg Deal Score", value: avgScore > 0 ? avgScore.toFixed(1) : "—", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active LPs", value: stats?.lps?.total ?? 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "IC In Review", value: stats?.deals?.icReview ?? 0, icon: GitBranch, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const stages: Record<string, number> = ventures.reduce((acc: Record<string, number>, v: any) => {
    const stage: string = v.stage ?? "Unknown";
    acc[stage] = (acc[stage] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sectors: Record<string, number> = ventures.reduce((acc: Record<string, number>, v: any) => {
    const sector: string = v.sector ?? "Unknown";
    acc[sector] = (acc[sector] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display">Fund Metrics</h1>
        <p className="text-muted-foreground mt-1">Portfolio performance, deployment stats, and fund-level KPIs.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`w-11 h-11 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                <p className={`font-bold text-xl mt-0.5 ${k.color}`}>{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stages).length === 0 ? (
              <p className="text-sm text-muted-foreground">No portfolio data available.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stages).sort((a, b) => b[1] - a[1]).map(([stage, count]) => {
                  const pct = ventures.length > 0 ? (count / ventures.length) * 100 : 0;
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{stage}</span>
                        <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio by Sector</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(sectors).length === 0 ? (
              <p className="text-sm text-muted-foreground">No portfolio data available.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(sectors).sort((a, b) => b[1] - a[1]).map(([sector, count]) => {
                  const pct = ventures.length > 0 ? (count / ventures.length) * 100 : 0;
                  return (
                    <div key={sector}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{sector}</span>
                        <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {ventures.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio Companies</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Sector</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-right px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ventures.slice(0, 20).map((v: any) => (
                  <tr key={v.id ?? v.founderId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{v.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.sector ?? "—"}</td>
                    <td className="px-4 py-3">
                      {v.stage && <Badge variant="outline" className="text-xs">{v.stage}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.score != null ? (
                        <span className="flex items-center justify-end gap-1 text-amber-600 font-semibold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {Number(v.score).toFixed(1)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.status && <Badge variant="outline" className="text-xs">{v.status}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
