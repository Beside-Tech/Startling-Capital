import { useEffect, useState } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GitBranch, Plus } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface Deal {
  id: number;
  companyName: string;
  sector?: string;
  stage?: string;
  amountSoughtCad?: string;
  instrument?: string;
  pipelineStage: string;
  source?: string;
}

const STAGES = [
  { value: "sourced",        label: "Sourced",        color: "bg-gray-100 text-gray-700 border-gray-200"      },
  { value: "interested",     label: "Interested",     color: "bg-sky-100 text-sky-700 border-sky-200"          },
  { value: "due_diligence",  label: "Due Diligence",  color: "bg-amber-100 text-amber-700 border-amber-200"    },
  { value: "ready_for_ic",   label: "Ready for IC",   color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "ic_approved",    label: "IC Approved",    color: "bg-teal-100 text-teal-700 border-teal-200"       },
  { value: "ic_rejected",    label: "IC Rejected",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "closing",        label: "Closing",        color: "bg-green-100 text-green-700 border-green-200"    },
  { value: "invested",       label: "Invested",       color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "deal_dead",      label: "Deal Dead",      color: "bg-neutral-100 text-neutral-500 border-neutral-200" },
  { value: "passed",         label: "Passed",         color: "bg-red-100 text-red-700 border-red-200"          },
] as const;

type StageValue = typeof STAGES[number]["value"];

export default function MPDealFlow() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <DealFlowInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function DealFlowInner() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyName: "", sector: "", stage: "", amountSoughtCad: "", instrument: "SAFE", pipelineStage: "sourced" as StageValue, source: "" });
  const [creating, setCreating] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");

  const fetchDeals = () => {
    fetch(`${BASE}/api/mp/deal-flow`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setDeals(d?.deals || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(); }, []);

  const createDeal = async () => {
    if (!form.companyName) return;
    setCreating(true);
    const res = await fetch(`${BASE}/api/mp/deal-flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setDeals(d => [data.deal, ...d]);
      setShowForm(false);
      setForm({ companyName: "", sector: "", stage: "", amountSoughtCad: "", instrument: "SAFE", pipelineStage: "sourced", source: "" });
      toast({ title: "Deal added" });
    }
    setCreating(false);
  };

  const moveStage = async (id: number, toStage: string) => {
    const res = await fetch(`${BASE}/api/deals/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ toStage }),
    });
    if (res.ok) {
      const { deal } = await res.json();
      setDeals(ds => ds.map(d => d.id === id ? { ...d, pipelineStage: deal.pipelineStage } : d));
    } else {
      const err = await res.json().catch(() => ({ error: "Transition rejected" }));
      toast({ title: err.error ?? "Invalid stage transition", variant: "destructive" });
      fetchDeals();
    }
  };

  const filtered = filterStage === "all" ? deals : deals.filter(d => d.pipelineStage === filterStage);

  const stageColor = (val: string) => STAGES.find(s => s.value === val)?.color ?? "bg-gray-100 text-gray-700";
  const stageLabel = (val: string) => STAGES.find(s => s.value === val)?.label ?? val.replace(/_/g, " ");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" /> Deal Flow
          </h1>
          <p className="text-muted-foreground mt-1">Manage the full investment pipeline for Nobellum Ventures.</p>
        </div>
        <Button className="gradient-teal text-white border-0 hover:opacity-90 gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4" /> Add Deal
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Deal</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {[
              { key: "companyName", label: "Company Name *", placeholder: "Startup Inc." },
              { key: "sector", label: "Sector", placeholder: "FinTech…" },
              { key: "stage", label: "Company Stage", placeholder: "Pre-Seed…" },
              { key: "amountSoughtCad", label: "Amount Sought (CAD)", placeholder: "500000" },
              { key: "instrument", label: "Instrument", placeholder: "SAFE, Equity…" },
              { key: "source", label: "Source", placeholder: "Referral, Network…" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
                <Input className="mt-1" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline Stage</label>
              <select className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background" value={form.pipelineStage} onChange={e => setForm(f => ({ ...f, pipelineStage: e.target.value as StageValue }))}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="gradient-teal text-white border-0 hover:opacity-90" onClick={createDeal} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Add to Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStage === "all" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
          onClick={() => setFilterStage("all")}
        >
          All ({deals.length})
        </button>
        {STAGES.map(s => {
          const cnt = deals.filter(d => d.pipelineStage === s.value).length;
          if (cnt === 0 && filterStage !== s.value) return null;
          return (
            <button
              key={s.value}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStage === s.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
              onClick={() => setFilterStage(s.value)}
            >
              {s.label} {cnt > 0 && `(${cnt})`}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No deals in this stage.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(deal => (
            <Card key={deal.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{deal.companyName}</span>
                      <Badge className={`text-xs border ${stageColor(deal.pipelineStage)}`}>{stageLabel(deal.pipelineStage)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{[deal.sector, deal.stage, deal.amountSoughtCad && `CAD ${Number(deal.amountSoughtCad).toLocaleString()}`].filter(Boolean).join(" · ")}</p>
                    {deal.source && <p className="text-xs text-muted-foreground">Source: {deal.source}</p>}
                  </div>
                  <div className="shrink-0">
                    <select
                      className="text-xs border rounded-lg px-2 py-1 bg-background"
                      value={deal.pipelineStage}
                      onChange={e => moveStage(deal.id, e.target.value)}
                    >
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
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
