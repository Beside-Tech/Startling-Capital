import { useEffect, useState } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, Star } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function ICPortfolio() {
  return (
    <ProtectedRoute icOnly>
      <ICLayout>
        <PortfolioInner />
      </ICLayout>
    </ProtectedRoute>
  );
}

function PortfolioInner() {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/ic/portfolio`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPortfolio(d?.portfolio || []))
      .finally(() => setLoading(false));
  }, []);

  const active = portfolio.filter(p => p.status === "active");
  const exited = portfolio.filter(p => p.status === "exited");
  const totalDeployed = active.reduce((s, p) => s + Number(p.amountCad || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" /> Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">Active portfolio companies and exits.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active Companies", value: active.length },
          { label: "Exits", value: exited.length },
          { label: "Total Deployed (CAD)", value: totalDeployed > 0 ? `$${totalDeployed.toLocaleString()}` : "—" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-5">
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : portfolio.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">No portfolio companies yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {portfolio.map(inv => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-start gap-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold">{inv.startupName}</span>
                    {inv.isLead && <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs gap-1"><Star className="h-2.5 w-2.5" />Lead</Badge>}
                    <Badge className={inv.status === "active" ? "bg-green-100 text-green-800 border-green-200 border text-xs" : "bg-gray-100 text-gray-800 border text-xs"}>
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{inv.founderName && `${inv.founderName} · `}{inv.instrument} · {inv.investmentDate}</p>
                  <div className="mt-2 flex gap-4 text-xs">
                    {inv.amountCad && <span className="text-foreground font-medium">CAD {Number(inv.amountCad).toLocaleString()}</span>}
                    {inv.equityPct && <span className="text-muted-foreground">{inv.equityPct}% equity</span>}
                    {inv.roundName && <span className="text-muted-foreground">{inv.roundName}</span>}
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
