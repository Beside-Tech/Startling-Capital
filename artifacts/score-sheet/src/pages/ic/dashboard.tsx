import { useEffect, useState } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  GitBranch, Briefcase, Vote, TrendingUp, ArrowRight, Loader2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STAGE_COLORS: Record<string, string> = {
  sourced:        "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  screening:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  due_diligence:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ic_review:      "bg-violet-100 text-violet-700",
  term_sheet:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  closed:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  passed:         "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function ICDashboard() {
  return (
    <ProtectedRoute icOnly>
      <ICLayout>
        <ICDashboardInner />
      </ICLayout>
    </ProtectedRoute>
  );
}

function ICDashboardInner() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/ic/deals`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/api/ic/portfolio`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([dealsData, portfolioData]) => {
      setData({ deals: dealsData?.deals || [], portfolio: portfolioData?.portfolio || [] });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const icReview = data?.deals?.filter((d: any) => d.pipelineStage === "ic_review") || [];
  const active = data?.portfolio?.filter((p: any) => p.status === "active") || [];

  const stats = [
    { label: "Total Deals", value: data?.deals?.length ?? 0, icon: GitBranch, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Needs IC Vote", value: icReview.length, icon: Vote, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Portfolio Companies", value: active.length, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">IC Dashboard</h1>
        <p className="text-muted-foreground mt-1">Investment Committee overview — Nobellum Ventures.</p>
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

      {icReview.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Vote className="h-4 w-4" /> Awaiting Your Vote ({icReview.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {icReview.slice(0, 5).map((deal: any) => (
              <div key={deal.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100 dark:border-amber-800/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">{deal.companyName}</p>
                  <p className="text-xs text-muted-foreground">{deal.sector} · {deal.stage}</p>
                </div>
                <button onClick={() => navigate("/ic/deals")} className="text-primary hover:underline text-xs font-medium flex items-center gap-1">
                  Vote <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Recent Deal Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.deals?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No deals in pipeline yet.</p>
          ) : (
            <div className="space-y-2">
              {data.deals.slice(0, 8).map((deal: any) => (
                <div key={deal.id} className="flex items-center gap-3 py-2">
                  <Badge className={`text-xs ${STAGE_COLORS[deal.pipelineStage] || "bg-gray-100 dark:bg-gray-700/40"}`}>
                    {deal.pipelineStage?.replace("_", " ")}
                  </Badge>
                  <span className="text-sm font-medium flex-1">{deal.companyName}</span>
                  <span className="text-xs text-muted-foreground">{deal.sector}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
