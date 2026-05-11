import { useEffect, useState } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, Star } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

export default function MPInvestments() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <InvestmentsInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function InvestmentsInner() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${BASE}/api/mp/investments`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setInvestments(d?.investments || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? investments : investments.filter(i => i.status === filter);
  const totalDeployed = investments.filter(i => i.status === "active").reduce((s, i) => s + Number(i.amountCad || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" /> Portfolio Investments
        </h1>
        <p className="text-muted-foreground mt-1">All investments managed through Startling Capital Ventures.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active Companies", value: investments.filter(i => i.status === "active").length },
          { label: "Exits", value: investments.filter(i => i.status === "exited").length },
          { label: "Total Deployed (CAD)", value: totalDeployed > 0 ? `$${totalDeployed.toLocaleString()}` : "—" },
        ].map(s => (
          <Card key={s.label}><CardContent className="py-5"><div className="text-2xl font-bold">{s.value}</div><div className="text-sm text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "active", "exited"].map(f => (
          <button key={f} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No investments found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{inv.startupName}</span>
                      {inv.isLead && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50 border text-xs gap-1 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50"><Star className="h-2.5 w-2.5" />Lead</Badge>}
                      <Badge className={inv.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50 border text-xs dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50" : "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border text-xs"}>{inv.status}</Badge>
                      <Badge className="bg-secondary text-secondary-foreground text-xs">{inv.instrument}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{[inv.founderName, inv.sector, inv.stage].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Invested: {inv.investmentDate} {inv.roundName && `· ${inv.roundName}`}</p>
                    {inv.notes && <p className="text-xs text-muted-foreground mt-1 italic">{inv.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {inv.amountCad && <p className="text-sm font-bold">CAD {Number(inv.amountCad).toLocaleString()}</p>}
                    {inv.amountUsd && <p className="text-xs text-muted-foreground">USD {Number(inv.amountUsd).toLocaleString()}</p>}
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

