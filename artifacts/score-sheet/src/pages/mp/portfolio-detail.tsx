import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, DollarSign, TrendingUp, Calendar, Building } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STAGE_COLORS: Record<string, string> = {
  invested: "bg-emerald-100 text-emerald-700",
  closing: "bg-amber-100 text-amber-700",
  ic_approved: "bg-green-100 text-green-700",
  due_diligence: "bg-blue-100 text-blue-700",
  ready_for_ic: "bg-violet-100 text-violet-700",
  passed: "bg-red-100 text-red-700",
  deal_dead: "bg-gray-100 text-gray-700",
};

export default function MPPortfolioDetail() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <PortfolioDetailInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function PortfolioDetailInner() {
  const [, params] = useRoute("/mp/portfolio/:dealId");
  const dealId = params?.dealId;
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [capTable, setCapTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;
    Promise.all([
      fetch(`${BASE}/api/ventures-vc/deals/${dealId}`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/api/mp/cap-table`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.ok ? r.json() : null),
    ]).then(([dealData, capData]) => {
      if (dealData) {
        setDeal(dealData.deal);
        setVotes(dealData.votes ?? []);
      }
      if (capData) {
        setCapTable((capData.entries ?? []).filter((e: any) => e.dealId === Number(dealId)));
      }
    }).finally(() => setLoading(false));
  }, [dealId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!deal) return <div className="p-8 text-center text-muted-foreground">Deal not found</div>;

  const totalVotes = votes.length;
  const approveCount = votes.filter(v => v.vote === "approve").length;
  const rejectCount = votes.filter(v => v.vote === "reject").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/mp/deal-flow">
          <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{deal.companyName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STAGE_COLORS[deal.pipelineStage] ?? "bg-gray-100 text-gray-700"}>
              {deal.pipelineStage?.replace(/_/g, " ")}
            </Badge>
            {deal.sector && <span className="text-sm text-muted-foreground">{deal.sector}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Amount Sought</span></div>
            <p className="text-lg font-bold">{deal.amountSoughtCad ? `$${Number(deal.amountSoughtCad).toLocaleString()}` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Instrument</span></div>
            <p className="text-lg font-bold">{deal.instrument ?? "SAFE"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Building className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Stage</span></div>
            <p className="text-lg font-bold">{deal.stage ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Decision Date</span></div>
            <p className="text-lg font-bold">{deal.decisionDate ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {votes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>IC Votes ({totalVotes})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <span className="text-green-600 font-medium">{approveCount} Approve</span>
              <span className="text-red-600 font-medium">{rejectCount} Reject</span>
              <span className="text-gray-500 font-medium">{totalVotes - approveCount - rejectCount} Abstain/More Info</span>
            </div>
            <div className="space-y-2">
              {votes.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <Badge variant="outline" className={v.vote === "approve" ? "text-green-600 border-green-300" : v.vote === "reject" ? "text-red-600 border-red-300" : "text-gray-500"}>
                    {v.vote}
                  </Badge>
                  <span className="font-medium">{v.voterName ?? "Unknown"}</span>
                  {v.comment && <span className="text-muted-foreground">{v.comment}</span>}
                  {v.dissentNote && <span className="text-red-600 italic text-xs">Dissent: {v.dissentNote}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {deal.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{deal.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
