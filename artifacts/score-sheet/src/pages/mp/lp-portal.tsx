import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, BookOpen, Send, Edit2, Trash2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const fmtMultiple = (v: any) => v != null ? `${Number(v).toFixed(2)}x` : "—";

export default function MPLPPortal() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout><MPLPPortalInner /></MPLayout>
    </ProtectedRoute>
  );
}

function MPLPPortalInner() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const blank = {
    quarter: "", year: new Date().getFullYear().toString(), title: "",
    body: "", tvpi: "", dpi: "", irr: "", nav: "",
    totalDeployedCad: "", portfolioCount: "", isPublished: false,
  };
  const [form, setForm] = useState(blank);

  const load = () => {
    fetch(`${BASE}/api/mp/quarterly-updates`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { updates: [] })
      .then(d => setUpdates(d.updates ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function startEdit(u: any) {
    setEditing(u);
    setForm({
      quarter: String(u.quarter ?? ""), year: String(u.year ?? ""), title: u.title ?? "",
      body: u.body ?? "", tvpi: u.tvpi ?? "", dpi: u.dpi ?? "", irr: u.irr ?? "",
      nav: u.nav ?? "", totalDeployedCad: u.totalDeployedCad ?? "",
      portfolioCount: String(u.portfolioCount ?? ""), isPublished: u.isPublished ?? false,
    });
    setCreating(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.quarter || !form.year || !form.title || !form.body) return;
    setSaving(true);
    const url = editing
      ? `${BASE}/api/mp/quarterly-updates/${editing.id}`
      : `${BASE}/api/mp/quarterly-updates`;
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setCreating(false);
    setEditing(null);
    setForm(blank);
    load();
  }

  async function publish(id: number) {
    await fetch(`${BASE}/api/mp/quarterly-updates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ isPublished: true }),
    });
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, isPublished: true } : u));
  }

  async function deleteUpdate(id: number) {
    if (!confirm("Delete this update?")) return;
    await fetch(`${BASE}/api/mp/quarterly-updates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">LP Quarterly Updates</h1>
          <p className="text-muted-foreground mt-1">Draft and publish quarterly letters for limited partners.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(blank); setCreating(true); }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />New Update
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing ? "Edit Update" : "New Quarterly Update"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Quarter *</label>
                  <select value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">Select...</option>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Year *</label>
                  <Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Title *</label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Q1 2025 LP Update" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Letter Body *</label>
                <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Dear limited partners..." rows={8} className="mt-1" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">TVPI</label>
                  <Input type="number" step="0.0001" value={form.tvpi} onChange={e => setForm(p => ({ ...p, tvpi: e.target.value }))} placeholder="1.35" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">DPI</label>
                  <Input type="number" step="0.0001" value={form.dpi} onChange={e => setForm(p => ({ ...p, dpi: e.target.value }))} placeholder="0.20" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">IRR %</label>
                  <Input type="number" step="0.0001" value={form.irr} onChange={e => setForm(p => ({ ...p, irr: e.target.value }))} placeholder="18.5" className="mt-1" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">NAV (CAD)</label>
                  <Input type="number" value={form.nav} onChange={e => setForm(p => ({ ...p, nav: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total Deployed (CAD)</label>
                  <Input type="number" value={form.totalDeployedCad} onChange={e => setForm(p => ({ ...p, totalDeployedCad: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Portfolio Companies</label>
                  <Input type="number" value={form.portfolioCount} onChange={e => setForm(p => ({ ...p, portfolioCount: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !form.quarter || !form.title || !form.body}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? "Save Changes" : "Create Draft"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null); setForm(blank); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {updates.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No quarterly updates yet.
          </CardContent></Card>
        ) : updates.map((u: any) => (
          <Card key={u.id}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Q{u.quarter} {u.year}</span>
                    <Badge className={u.isPublished ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                      {u.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.title}</p>
                  <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-muted-foreground">
                    {u.tvpi && <span>TVPI {fmtMultiple(u.tvpi)}</span>}
                    {u.dpi && <span>DPI {fmtMultiple(u.dpi)}</span>}
                    {u.irr && <span>IRR {Number(u.irr).toFixed(1)}%</span>}
                    {u.portfolioCount && <span>{u.portfolioCount} companies</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!u.isPublished && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => publish(u.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" />Publish
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => startEdit(u)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteUpdate(u.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
