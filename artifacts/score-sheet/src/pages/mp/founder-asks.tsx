import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  intro: "Intro", hiring: "Hiring", legal: "Legal", finance: "Finance",
  product: "Product", marketing: "Marketing", bd: "BD", other: "Other",
};

export default function MPFounderAsks() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout><MPFounderAsksInner /></MPLayout>
    </ProtectedRoute>
  );
}

function MPFounderAsksInner() {
  const [asks, setAsks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = () => {
    fetch(`${BASE}/api/mp/founder-asks`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { asks: [] })
      .then(d => setAsks(d.asks ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    await fetch(`${BASE}/api/mp/founder-asks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    setAsks(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const filtered = filter === "all" ? asks : asks.filter(a => a.status === filter);

  const counts = {
    all: asks.length,
    open: asks.filter(a => a.status === "open").length,
    in_progress: asks.filter(a => a.status === "in_progress").length,
    fulfilled: asks.filter(a => a.status === "fulfilled").length,
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Founder Asks</h1>
        <p className="text-muted-foreground mt-1">Portfolio founder help requests — intros, hiring, legal, and more.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "all", label: "All Asks", count: counts.all, icon: HelpCircle, color: "text-blue-600", bg: "bg-blue-50" },
          { key: "open", label: "Open", count: counts.open, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { key: "in_progress", label: "In Progress", count: counts.in_progress, icon: Clock, color: "text-violet-600", bg: "bg-violet-50" },
          { key: "fulfilled", label: "Fulfilled", count: counts.fulfilled, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <Card
            key={s.key}
            className={`cursor-pointer hover:shadow-sm transition-shadow ${filter === s.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter(s.key)}
          >
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`font-bold text-lg ${s.color}`}>{s.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            <HelpCircle className="h-7 w-7 mx-auto mb-2 opacity-30" />
            No asks in this category.
          </CardContent></Card>
        ) : filtered.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={`text-xs ${PRIORITY_COLOR[a.priority] ?? ""}`}>{a.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                    <Badge className={`text-xs ${STATUS_COLOR[a.status] ?? ""}`}>{a.status}</Badge>
                  </div>
                  <p className="font-medium text-sm">{a.title}</p>
                  {a.companyName && <p className="text-xs text-muted-foreground mt-0.5">{a.companyName} · {a.founderName}</p>}
                  {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                  {a.fulfilledNote && (
                    <p className="text-xs bg-emerald-50 text-emerald-700 rounded-md px-2 py-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {a.fulfilledNote}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  {a.status === "open" && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(a.id, "in_progress")}>
                      <Clock className="h-3.5 w-3.5 mr-1" />Pick Up
                    </Button>
                  )}
                  {(a.status === "open" || a.status === "in_progress") && (
                    <Button size="sm" className="text-xs" onClick={() => updateStatus(a.id, "fulfilled")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Fulfil
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
