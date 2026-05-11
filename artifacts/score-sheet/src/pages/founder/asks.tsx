import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { FounderLayout } from "@/components/founder-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, HelpCircle, CheckCircle2, Trash2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
};

export default function FounderAsks() {
  return (
    <ProtectedRoute>
      <FounderLayout>
        <FounderAsksInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function FounderAsksInner() {
  const [asks, setAsks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "other", title: "", description: "", priority: "medium" });

  const load = () => {
    fetch(`${BASE}/api/founder/asks`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { asks: [] })
      .then(d => setAsks(d.asks ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`${BASE}/api/founder/asks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setCreating(false);
    setForm({ category: "other", title: "", description: "", priority: "medium" });
    load();
  }

  async function deleteAsk(id: number) {
    await fetch(`${BASE}/api/founder/asks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setAsks(prev => prev.filter(a => a.id !== id));
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">My Asks</h1>
            <p className="text-muted-foreground mt-1">Request help from the Startling Capital team — intros, hiring, legal, and more.</p>
          </div>
          <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />New Ask
          </Button>
        </div>

        {creating && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Submit an Ask</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Category</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background">
                      {[["intro", "Intro / Connection"], ["hiring", "Hiring"], ["legal", "Legal"], ["finance", "Finance"], ["product", "Product Advice"], ["marketing", "Marketing"], ["bd", "Business Dev"], ["other", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background">
                      {["low", "medium", "high", "urgent"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">What do you need? *</label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Intro to Series A fintech investors" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">More context</label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Any additional context that would help us fulfill this ask..." rows={3} className="mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving || !form.title.trim()}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit Ask"}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {asks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No asks yet. Submit your first ask to the team.
            </CardContent></Card>
          ) : asks.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <Badge className={`text-xs ${PRIORITY_COLOR[a.priority] ?? ""}`}>{a.priority}</Badge>
                      <Badge className={`text-xs ${STATUS_COLOR[a.status] ?? ""}`}>{a.status}</Badge>
                    </div>
                    <p className="font-medium text-sm">{a.title}</p>
                    {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                    {a.status === "fulfilled" && a.fulfilledNote && (
                      <p className="text-xs bg-emerald-50 text-emerald-700 rounded-md px-2 py-1 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />{a.fulfilledNote}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(a.createdAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                    </p>
                  </div>
                  {a.status === "open" && (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteAsk(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}

