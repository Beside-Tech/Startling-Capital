import { useState, useEffect } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, BarChart3, BookOpen } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const fmtMultiple = (v: any) => v != null ? `${Number(v).toFixed(2)}x` : "—";
const fmtPct = (v: any) => v != null ? `${Number(v).toFixed(1)}%` : "—";
const fmtCad = (v: any) => v != null ? `$${Number(v).toLocaleString()}` : "—";

export default function LPPortal() {
  return (
    <ProtectedRoute lpOnly>
      <LPLayout><LPPortalInner /></LPLayout>
    </ProtectedRoute>
  );
}

function LPPortalInner() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/lp/quarterly-updates`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { updates: [] })
      .then(d => {
        const list = d.updates ?? [];
        setUpdates(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">LP Portal</h1>
        <p className="text-muted-foreground mt-1">Quarterly updates, fund performance, and portfolio transparency.</p>
      </div>

      {selected && (
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "TVPI", value: fmtMultiple(selected.tvpi), icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "DPI", value: fmtMultiple(selected.dpi), icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Net IRR", value: fmtPct(selected.irr), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "NAV", value: fmtCad(selected.nav), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`font-bold text-xl mt-0.5 ${k.color}`}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quarterly Letters</h2>
          {updates.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              <BookOpen className="h-7 w-7 mx-auto mb-2 opacity-30" />
              No updates published yet.
            </CardContent></Card>
          ) : updates.map((u: any) => (
            <Card
              key={u.id}
              className={`cursor-pointer hover:shadow-sm transition-shadow ${selected?.id === u.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelected(u)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">Q{u.quarter} {u.year}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">{u.title}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{fmtMultiple(u.tvpi)} TVPI</div>
                    <div>{fmtPct(u.irr)} IRR</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selected.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Q{selected.quarter} {selected.year}
                      {selected.publishedAt && ` · Published ${new Date(selected.publishedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4 border-b">
                  {[
                    { label: "Total Deployed", value: fmtCad(selected.totalDeployedCad) },
                    { label: "Portfolio Cos.", value: selected.portfolioCount ?? "—" },
                    { label: "TVPI", value: fmtMultiple(selected.tvpi) },
                    { label: "DPI", value: fmtMultiple(selected.dpi) },
                    { label: "RVPI", value: fmtMultiple(selected.rvpi) },
                    { label: "IRR", value: fmtPct(selected.irr) },
                  ].map(m => (
                    <div key={m.label} className="text-sm">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="font-semibold mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Select an update to read the full letter.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
