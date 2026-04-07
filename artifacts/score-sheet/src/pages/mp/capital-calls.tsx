import { useState, useEffect, useCallback } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, CheckCircle, DollarSign, Calendar } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export default function MPCapitalCalls() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <MPCapitalCallsInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function MPCapitalCallsInner() {
  const { toast } = useToast();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", callDate: "", dueDate: "", totalAmountCad: "", status: "draft", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${BASE}/api/mp/capital-calls`, { headers: { Authorization: `Bearer ${token()}` } });
    if (r.ok) setCalls(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title || !form.callDate) return toast({ title: "Title and call date are required", variant: "destructive" });
    setSaving(true);
    const r = await fetch(`${BASE}/api/mp/capital-calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      toast({ title: "Capital call created" });
      setShowCreate(false);
      setForm({ title: "", callDate: "", dueDate: "", totalAmountCad: "", status: "draft", notes: "" });
      load();
    } else {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const r = await fetch(`${BASE}/api/mp/capital-calls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    if (r.ok) { toast({ title: "Status updated" }); load(); }
  };

  const deleteCall = async (id: number) => {
    if (!confirm("Delete this capital call?")) return;
    await fetch(`${BASE}/api/mp/capital-calls/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    toast({ title: "Deleted" });
    load();
  };

  const markPaid = async (callId: number, allocId: number) => {
    const r = await fetch(`${BASE}/api/mp/capital-calls/${callId}/allocations/${allocId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ paidAt: new Date().toISOString() }),
    });
    if (r.ok) { toast({ title: "Marked as paid" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Capital Calls</h1>
          <p className="text-muted-foreground mt-1">Manage LP capital calls and track payments.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Capital Call
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : calls.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No capital calls yet. Create your first one above.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {calls.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <Badge className={STATUS_COLOR[c.status] ?? ""}>{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["draft","sent","partial","complete"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCall(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Call: {c.callDate}</span>
                  {c.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Due: {c.dueDate}</span>}
                  {c.totalAmountCad && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${Number(c.totalAmountCad).toLocaleString()} CAD</span>}
                </div>
              </CardHeader>
              {c.allocations?.length > 0 && (
                <CardContent>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">LP Allocations</p>
                  <div className="space-y-2">
                    {c.allocations.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{a.firmName ?? "—"}</span>
                          {a.contactName && <span className="text-muted-foreground ml-1.5">({a.contactName})</span>}
                          {a.allocatedAmountCad && <span className="ml-2 text-emerald-700 font-semibold">${Number(a.allocatedAmountCad).toLocaleString()}</span>}
                        </div>
                        {a.paidAt ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 gap-1"><CheckCircle className="h-3 w-3" /> Paid {new Date(a.paidAt).toLocaleDateString()}</Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(c.id, a.id)}>Mark Paid</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Capital Call</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Q1 2025 Capital Call" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Call Date</Label>
                <Input type="date" value={form.callDate} onChange={e => setForm(f => ({ ...f, callDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Total Amount (CAD)</Label>
              <Input type="number" placeholder="500000" value={form.totalAmountCad} onChange={e => setForm(f => ({ ...f, totalAmountCad: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","sent","partial","complete"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
