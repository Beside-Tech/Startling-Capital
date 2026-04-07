import { useState, useEffect, useCallback } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, ChevronDown, ChevronUp, DollarSign, ThumbsUp, ThumbsDown, Minus, Calendar } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STAGE_COLOR: Record<string, string> = {
  "Pre-Seed": "bg-violet-100 text-violet-700",
  "Seed": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Series A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Series B": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const PIPELINE_COLOR: Record<string, string> = {
  sourced: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
  screening: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "first-meeting": "bg-violet-100 text-violet-700",
  "ic-review": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "term-sheet": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  invested: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  passed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const VOTE_ICON = {
  invest: <ThumbsUp className="h-3.5 w-3.5 text-green-600" />,
  pass: <ThumbsDown className="h-3.5 w-3.5 text-red-500" />,
  hold: <Minus className="h-3.5 w-3.5 text-amber-500" />,
};

export default function ICPackets() {
  return (
    <ProtectedRoute>
      <ICLayout>
        <ICPacketsInner />
      </ICLayout>
    </ProtectedRoute>
  );
}

function ICPacketsInner() {
  const [deals, setDeals] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [details, setDetails] = useState<Record<number, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${BASE}/api/ic/deals`, { headers: { Authorization: `Bearer ${token()}` } });
    if (r.ok) {
      const data = await r.json();
      setDeals(data.deals ?? []);
      setVoteCounts(data.voteCounts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (id: number) => {
    const next = !expanded[id];
    setExpanded(prev => ({ ...prev, [id]: next }));
    if (next && !details[id]) {
      setLoadingDetail(prev => ({ ...prev, [id]: true }));
      const r = await fetch(`${BASE}/api/ic/deal/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) {
        const d = await r.json();
        setDetails(prev => ({ ...prev, [id]: d }));
      }
      setLoadingDetail(prev => ({ ...prev, [id]: false }));
    }
  };

  const getVoteSummary = (dealId: number) => {
    const votes = voteCounts.filter(v => v.dealId === dealId);
    return {
      invest: votes.find(v => v.vote === "invest")?.cnt ?? 0,
      pass: votes.find(v => v.vote === "pass")?.cnt ?? 0,
      hold: votes.find(v => v.vote === "hold")?.cnt ?? 0,
    };
  };

  const filtered = deals.filter(d =>
    !search ||
    d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    d.sector?.toLowerCase().includes(search.toLowerCase()) ||
    d.pipelineStage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">IC Meeting Packets</h1>
        <p className="text-muted-foreground mt-1">Investment Committee review packets. Expand any deal for full diligence details and vote summary.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by company, sector, or stage…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No deals in the pipeline yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((deal) => {
            const votes = getVoteSummary(deal.id);
            return (
              <Card key={deal.id} className="overflow-hidden">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpand(deal.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{deal.companyName}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {deal.sector && <span className="text-sm text-muted-foreground">{deal.sector}</span>}
                          {deal.stage && <Badge className={`text-xs ${STAGE_COLOR[deal.stage] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300"}`}>{deal.stage}</Badge>}
                          {deal.pipelineStage && <Badge className={`text-xs ${PIPELINE_COLOR[deal.pipelineStage] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300"}`}>{deal.pipelineStage}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 text-xs">
                        {votes.invest > 0 && <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium"><ThumbsUp className="h-3 w-3" />{votes.invest}</span>}
                        {votes.hold > 0 && <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium"><Minus className="h-3 w-3" />{votes.hold}</span>}
                        {votes.pass > 0 && <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium"><ThumbsDown className="h-3 w-3" />{votes.pass}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {expanded[deal.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expanded[deal.id] && (
                  <CardContent className="border-t pt-4">
                    {loadingDetail[deal.id] ? (
                      <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
                    ) : (
                      <ICPacketDetail deal={deal} detail={details[deal.id]} />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ICPacketDetail({ deal, detail }: { deal: any; detail: any }) {
  const fields = [
    { label: "Instrument", value: deal.instrument },
    { label: "Raise Ask", value: deal.amountSoughtCad ? `$${Number(deal.amountSoughtCad).toLocaleString()} CAD` : null },
    { label: "Source", value: deal.source },
    { label: "Assigned To", value: deal.assignedToName },
    { label: "Decision Date", value: deal.decisionDate },
  ].filter(f => f.value);

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map(f => (
            <div key={f.label} className="bg-muted/40 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="font-medium text-sm mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {deal.notes && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground leading-relaxed">{deal.notes}</p>
        </div>
      )}

      {detail?.votes?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">IC Votes ({detail.votes.length})</p>
          <div className="space-y-2">
            {detail.votes.map((v: any) => (
              <div key={v.id} className="flex items-start gap-2.5 text-sm bg-muted/30 rounded-lg px-3 py-2">
                <div className="mt-0.5 flex-shrink-0">
                  {VOTE_ICON[v.vote as keyof typeof VOTE_ICON] ?? <Minus className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <span className="font-medium capitalize">{v.vote}</span>
                  {v.voterName && <span className="text-muted-foreground ml-1.5">by {v.voterName}</span>}
                  {v.comment && <p className="text-muted-foreground mt-0.5">{v.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!detail?.votes || detail.votes.length === 0) && (
        <p className="text-sm text-muted-foreground italic">No votes cast yet for this deal.</p>
      )}
    </div>
  );
}
