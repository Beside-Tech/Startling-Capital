import { useEffect, useState } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function LPPortfolio() {
  return (
    <ProtectedRoute lpOnly>
      <LPLayout>
        <PortfolioInner />
      </LPLayout>
    </ProtectedRoute>
  );
}

function PortfolioInner() {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/lp/portfolio`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setPortfolio(d?.portfolio || []); setSummary(d?.summary || {}); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">Active portfolio companies in Nobellum Ventures.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card><CardContent className="py-5"><div className="text-2xl font-bold">{summary.totalCompanies ?? 0}</div><div className="text-sm text-muted-foreground">Portfolio Companies</div></CardContent></Card>
        <Card><CardContent className="py-5"><div className="text-2xl font-bold">{summary.totalDeployedCad > 0 ? `$${Number(summary.totalDeployedCad).toLocaleString()}` : "—"}</div><div className="text-sm text-muted-foreground">Total Deployed (CAD)</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : portfolio.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No portfolio companies yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {portfolio.map(inv => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{inv.startupName}</span>
                      <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">{inv.instrument}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{[inv.sector, inv.stage, inv.country].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Invested: {inv.investmentDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {inv.amountCad && <p className="text-sm font-bold text-foreground">CAD {Number(inv.amountCad).toLocaleString()}</p>}
                    {inv.equityPct && <p className="text-xs text-muted-foreground">{inv.equityPct}% equity</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
