import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface DiligenceChecklist {
  id: number;
  companyName?: string;
  dealId?: number;
  status?: string;
  createdAt?: string;
}

interface DiligenceItem {
  id: number;
  title: string;
  category?: string;
  status: string;
  notes?: string;
  assignedTo?: string;
  dueDate?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  legal: "bg-blue-100 text-blue-700",
  financial: "bg-green-100 text-green-700",
  technical: "bg-purple-100 text-purple-700",
  team: "bg-orange-100 text-orange-700",
  market: "bg-cyan-100 text-cyan-700",
  product: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export default function MPDiligenceDetail() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <DiligenceDetailInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function DiligenceDetailInner() {
  const [, params] = useRoute("/mp/diligence/:id");
  const checklistId = params?.id;
  const { toast } = useToast();
  const [data, setData] = useState<{ checklist: DiligenceChecklist; items: DiligenceItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChecklist = () => {
    if (!checklistId) return;
    fetch(`${BASE}/api/diligence/checklists/${checklistId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchChecklist(); }, [checklistId]);

  const toggleItem = async (itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "complete" ? "pending" : "complete";
    const res = await fetch(
      `${BASE}/api/diligence/checklists/${checklistId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    if (res.ok) {
      fetchChecklist();
      toast({ title: nextStatus === "complete" ? "Item marked complete" : "Item re-opened" });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Checklist not found</div>;

  const { checklist, items } = data;
  const completed = items.filter(i => i.status === "complete").length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const byCategory = items.reduce<Record<string, DiligenceItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/mp/deal-flow">
          <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{checklist.companyName ?? "Unknown Company"} — Due Diligence</h1>
          {checklist.status && <p className="text-muted-foreground text-sm capitalize">{checklist.status}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 bg-muted rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium w-20 text-right">{completed}/{items.length} ({pct}%)</span>
      </div>

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Badge>
              <span className="text-muted-foreground font-normal text-sm">{catItems.filter(i => i.status === "complete").length}/{catItems.length} complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {catItems.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <Checkbox
                    checked={item.status === "complete"}
                    onCheckedChange={() => toggleItem(item.id, item.status)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                  </div>
                  {item.status === "complete" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
