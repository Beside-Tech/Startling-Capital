import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Plus, DollarSign } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  complete: "bg-green-100 text-green-700",
};

export default function MPFundCapitalCalls() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <FundCapitalCallsInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function FundCapitalCallsInner() {
  const [, params] = useRoute("/mp/funds/:fundId/capital-calls");
  const fundId = params?.fundId;
  const { toast } = useToast();
  const [fund, setFund] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", callDate: "", dueDate: "", totalAmountCad: "", notes: "" });
  const [creating, setCreating] = useState(false);

  const fetchData = () => {
    if (!fundId) return;
    Promise.all([
      fetch(`${BASE}/api/mp/funds`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.ok ? r.json() : null),
      fetch(`${BASE}/api/mp/capital-calls`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.ok ? r.json() : null),
    ]).then(([fundsData, callsData]) => {
      const fund = (fundsData?.funds ?? []).find((f: any) => String(f.id) === fundId);
      setFund(fund ?? null);
      setCalls((callsData?.capitalCalls ?? []).filter((c: any) => String(c.fundId) === fundId));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [fundId]);

  const createCall = async () => {
    if (!form.title || !form.callDate) return;
    setCreating(true);
    const res = await fetch(`${BASE}/api/mp/capital-calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, fundId: Number(fundId) }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", callDate: "", dueDate: "", totalAmountCad: "", notes: "" });
      fetchData();
      toast({ title: "Capital call created" });
    } else {
      toast({ title: "Failed to create capital call", variant: "destructive" });
    }
    setCreating(false);
  };

  const generateAllocations = async (callId: number) => {
    const res = await fetch(`${BASE}/api/mp/capital-calls/${callId}/generate-allocations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      const d = await res.json();
      toast({ title: `Generated ${d.count ?? 0} LP allocations` });
      fetchData();
    } else {
      toast({ title: "Failed to generate allocations", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/mp/funds">
            <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{fund?.name ?? `Fund ${fundId}`} — Capital Calls</h1>
            {fund && <p className="text-sm text-muted-foreground">Vintage {fund.vintage ?? "—"} · {fund.currency ?? "CAD"}</p>}
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" />New Capital Call
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Capital Call</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Call Date *</label>
                <Input type="date" value={form.callDate} onChange={e => setForm(f => ({ ...f, callDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <Input placeholder="Total Amount (CAD)" value={form.totalAmountCad} onChange={e => setForm(f => ({ ...f, totalAmountCad: e.target.value }))} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button onClick={createCall} disabled={creating || !form.title || !form.callDate}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {calls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No capital calls for this fund yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {calls.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.title}</p>
                      <Badge className={STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"}>{c.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Call: {c.callDate}
                      {c.dueDate && ` · Due: ${c.dueDate}`}
                      {c.totalAmountCad && ` · $${Number(c.totalAmountCad).toLocaleString()} CAD`}
                    </p>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                  </div>
                  {c.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => generateAllocations(c.id)}>
                      Generate Allocations
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
