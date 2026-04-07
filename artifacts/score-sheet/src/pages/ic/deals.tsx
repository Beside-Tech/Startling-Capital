import { useEffect, useState } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  GitBranch, Plus, ChevronDown, ChevronRight,
  CheckCircle, XCircle, HelpCircle, Info, Loader2, Send,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STAGES = ["sourced","screening","due_diligence","ic_review","term_sheet","closed","passed"] as const;
const STAGE_COLORS: Record<string, string> = {
  sourced: "bg-gray-100 text-gray-700", screening: "bg-blue-100 text-blue-700",
  due_diligence: "bg-amber-100 text-amber-700", ic_review: "bg-violet-100 text-violet-700",
  term_sheet: "bg-green-100 text-green-700", closed: "bg-emerald-100 text-emerald-700",
  passed: "bg-red-100 text-red-700",
};

const VOTE_OPTIONS = [
  { value: "approve",    label: "Approve",    icon: CheckCircle, color: "text-green-600",  cls: "border-green-200 bg-green-50 hover:bg-green-100" },
  { value: "reject",     label: "Reject",     icon: XCircle,     color: "text-red-600",    cls: "border-red-200 bg-red-50 hover:bg-red-100"     },
  { value: "more_info",  label: "More Info",  icon: Info,        color: "text-blue-600",   cls: "border-blue-200 bg-blue-50 hover:bg-blue-100"  },
  { value: "abstain",    label: "Abstain",    icon: HelpCircle,  color: "text-gray-600",   cls: "border-gray-200 bg-gray-50 hover:bg-gray-100"  },
];

export default function ICDeals() {
  return (
    <ProtectedRoute icOnly>
      <ICLayout>
        <DealsInner />
      </ICLayout>
    </ProtectedRoute>
  );
}

function DealsInner() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [voting, setVoting] = useState<Record<number, boolean>>({});
  const [voteComment, setVoteComment] = useState<Record<number, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ companyName: "", sector: "", stage: "", amountSoughtCad: "", instrument: "SAFE", source: "" });

  const fetchDeals = () => {
    fetch(`${BASE}/api/ic/deals`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setDeals(d.deals || []); setVoteCounts(d.voteCounts || []); } })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(); }, []);

  const getVoteCount = (dealId: number, voteType: string) =>
    voteCounts.find((v: any) => v.dealId === dealId && v.vote === voteType)?.cnt ?? 0;

  const castVote = async (dealId: number, vote: string) => {
    setVoting(v => ({ ...v, [dealId]: true }));
    const res = await fetch(`${BASE}/api/ic/deals/${dealId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ vote, comment: voteComment[dealId] || "" }),
    });
    if (res.ok) {
      toast({ title: `Vote recorded: ${vote}` });
      fetchDeals();
    } else {
      toast({ title: "Failed to cast vote", variant: "destructive" });
    }
    setVoting(v => ({ ...v, [dealId]: false }));
  };

  const updateStage = async (id: number, toStage: string) => {
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
      // Reload to sync actual server state
      fetchDeals();
    }
  };

  const createDeal = async () => {
    if (!newForm.companyName) return;
    const res = await fetch(`${BASE}/api/ic/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const data = await res.json();
      setDeals(d => [data.deal, ...d]);
      setShowNew(false);
      setNewForm({ companyName: "", sector: "", stage: "", amountSoughtCad: "", instrument: "SAFE", source: "" });
      toast({ title: "Deal added to pipeline" });
    }
  };

  const filtered = stageFilter === "all" ? deals : deals.filter(d => d.pipelineStage === stageFilter);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" /> Deal Flow
          </h1>
          <p className="text-muted-foreground mt-1">Review and vote on investment opportunities.</p>
        </div>
        <Button className="gradient-teal text-white border-0 hover:opacity-90 gap-2" onClick={() => setShowNew(s => !s)}>
          <Plus className="h-4 w-4" /> Add Deal
        </Button>
      </div>

      {showNew && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Deal</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {[
              { key: "companyName", label: "Company Name *", placeholder: "Startup Inc." },
              { key: "sector", label: "Sector", placeholder: "FinTech, HealthTech…" },
              { key: "stage", label: "Stage", placeholder: "Pre-Seed, Seed…" },
              { key: "amountSoughtCad", label: "Amount Sought (CAD)", placeholder: "500000" },
              { key: "instrument", label: "Instrument", placeholder: "SAFE, Equity…" },
              { key: "source", label: "Source", placeholder: "Referral, Network…" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
                <Input className="mt-1" value={(newForm as any)[key]} onChange={e => setNewForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button className="gradient-teal text-white border-0 hover:opacity-90" onClick={createDeal}>Add to Pipeline</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage filters */}
      <div className="flex gap-2 flex-wrap">
        <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stageFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`} onClick={() => setStageFilter("all")}>All</button>
        {STAGES.map(s => {
          const cnt = deals.filter(d => d.pipelineStage === s).length;
          return <button key={s} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stageFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`} onClick={() => setStageFilter(s)}>{s.replace("_", " ")} {cnt > 0 && `(${cnt})`}</button>;
        })}
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">No deals in this stage.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(deal => (
            <Card key={deal.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-0">
                <button className="w-full flex items-start gap-3 py-4 text-left" onClick={() => setExpanded(e => e === deal.id ? null : deal.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{deal.companyName}</span>
                      <Badge className={`text-xs ${STAGE_COLORS[deal.pipelineStage]}`}>{deal.pipelineStage?.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{[deal.sector, deal.stage, deal.amountSoughtCad && `CAD ${Number(deal.amountSoughtCad).toLocaleString()}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground shrink-0 items-center">
                    <span className="text-green-600">{getVoteCount(deal.id, "approve")}✓</span>
                    <span className="text-red-600">{getVoteCount(deal.id, "reject")}✗</span>
                    {expanded === deal.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>
                {expanded === deal.id && (
                  <div className="border-t border-border px-0 pb-4 pt-3 space-y-4">
                    {/* Stage update */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">Move to stage:</span>
                      <select
                        className="text-xs border rounded-lg px-2 py-1 bg-background"
                        value={deal.pipelineStage}
                        onChange={e => updateStage(deal.id, e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </div>
                    {deal.notes && <p className="text-sm text-muted-foreground bg-secondary/50 rounded-xl p-3">{deal.notes}</p>}
                    {/* Voting */}
                    {deal.pipelineStage === "ic_review" && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Cast your vote:</p>
                        <div className="flex gap-2 flex-wrap">
                          {VOTE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              disabled={voting[deal.id]}
                              onClick={() => castVote(deal.id, opt.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${opt.cls}`}
                            >
                              <opt.icon className={`h-3.5 w-3.5 ${opt.color}`} /> {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a comment (optional)..."
                            value={voteComment[deal.id] || ""}
                            onChange={e => setVoteComment(v => ({ ...v, [deal.id]: e.target.value }))}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
