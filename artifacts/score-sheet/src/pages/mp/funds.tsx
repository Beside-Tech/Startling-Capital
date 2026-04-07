import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, TrendingUp, DollarSign, Percent, Edit2, Trash2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLOR: Record<string, string> = {
  fundraising: "bg-blue-100 text-blue-700",
  investing: "bg-emerald-100 text-emerald-700",
  harvesting: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-700",
};

const fmt = (v: any) => v != null ? Number(v).toLocaleString() : "—";
const fmtMultiple = (v: any) => v != null ? `${Number(v).toFixed(2)}x` : "—";
const fmtPct = (v: any) => v != null ? `${Number(v).toFixed(1)}%` : "—";

export default function MPFunds() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout><MPFundsInner /></MPLayout>
    </ProtectedRoute>
  );
}

function MPFundsInner() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const blank = {
    name: "", vintage: new Date().getFullYear().toString(), currency: "CAD",
    fundSizeCad: "", committedCapitalCad: "", calledCapitalCad: "",
    distributedCapitalCad: "", navCad: "", tvpi: "", dpi: "", rvpi: "", irr: "",
    managementFeePct: "2.0", carriedInterestPct: "20.0",
    investmentPeriodEndDate: "", fundTermYears: "", status: "investing", strategy: "", notes: "",
  };
  const [form, setForm] = useState(blank);

  const load = () => {
    fetch(`${BASE}/api/mp/funds`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { funds: [] })
      .then(d => setFunds(d.funds ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function startEdit(f: any) {
    setEditing(f);
    setForm({
      name: f.name ?? "", vintage: String(f.vintage ?? ""), currency: f.currency ?? "CAD",
      fundSizeCad: f.fundSizeCad ?? "", committedCapitalCad: f.committedCapitalCad ?? "",
      calledCapitalCad: f.calledCapitalCad ?? "", distributedCapitalCad: f.distributedCapitalCad ?? "",
      navCad: f.navCad ?? "", tvpi: f.tvpi ?? "", dpi: f.dpi ?? "", rvpi: f.rvpi ?? "", irr: f.irr ?? "",
      managementFeePct: f.managementFeePct ?? "2.0", carriedInterestPct: f.carriedInterestPct ?? "20.0",
      investmentPeriodEndDate: f.investmentPeriodEndDate ?? "", fundTermYears: String(f.fundTermYears ?? ""),
      status: f.status ?? "investing", strategy: f.strategy ?? "", notes: f.notes ?? "",
    });
    setCreating(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.vintage) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/mp/funds/${editing.id}` : `${BASE}/api/mp/funds`;
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

  async function deleteFund(id: number) {
    if (!confirm("Delete this fund?")) return;
    await fetch(`${BASE}/api/mp/funds/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Fund Administration</h1>
          <p className="text-muted-foreground mt-1">Manage fund vehicles, metrics, and performance (TVPI / DPI / IRR).</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(blank); setCreating(true); }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />New Fund
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing ? "Edit Fund" : "New Fund"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Fund Name *</label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nobellum Fund I" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vintage Year *</label>
                  <Input type="number" value={form.vintage} onChange={e => setForm(p => ({ ...p, vintage: e.target.value }))} placeholder="2024" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background">
                    {["fundraising", "investing", "harvesting", "closed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Fund Size (CAD)</label>
                  <Input type="number" value={form.fundSizeCad} onChange={e => setForm(p => ({ ...p, fundSizeCad: e.target.value }))} placeholder="50000000" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Committed Capital (CAD)</label>
                  <Input type="number" value={form.committedCapitalCad} onChange={e => setForm(p => ({ ...p, committedCapitalCad: e.target.value }))} placeholder="40000000" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Called Capital (CAD)</label>
                  <Input type="number" value={form.calledCapitalCad} onChange={e => setForm(p => ({ ...p, calledCapitalCad: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Distributed (CAD)</label>
                  <Input type="number" value={form.distributedCapitalCad} onChange={e => setForm(p => ({ ...p, distributedCapitalCad: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">NAV (CAD)</label>
                  <Input type="number" value={form.navCad} onChange={e => setForm(p => ({ ...p, navCad: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fund Term (years)</label>
                  <Input type="number" value={form.fundTermYears} onChange={e => setForm(p => ({ ...p, fundTermYears: e.target.value }))} placeholder="10" className="mt-1" />
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">TVPI</label>
                  <Input type="number" step="0.0001" value={form.tvpi} onChange={e => setForm(p => ({ ...p, tvpi: e.target.value }))} placeholder="1.35" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">DPI</label>
                  <Input type="number" step="0.0001" value={form.dpi} onChange={e => setForm(p => ({ ...p, dpi: e.target.value }))} placeholder="0.20" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">RVPI</label>
                  <Input type="number" step="0.0001" value={form.rvpi} onChange={e => setForm(p => ({ ...p, rvpi: e.target.value }))} placeholder="1.15" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Net IRR %</label>
                  <Input type="number" step="0.0001" value={form.irr} onChange={e => setForm(p => ({ ...p, irr: e.target.value }))} placeholder="18.5" className="mt-1" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Management Fee %</label>
                  <Input type="number" step="0.01" value={form.managementFeePct} onChange={e => setForm(p => ({ ...p, managementFeePct: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carried Interest %</label>
                  <Input type="number" step="0.01" value={form.carriedInterestPct} onChange={e => setForm(p => ({ ...p, carriedInterestPct: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Strategy</label>
                <Textarea value={form.strategy} onChange={e => setForm(p => ({ ...p, strategy: e.target.value }))} placeholder="Pre-seed and seed stage Canadian tech companies..." rows={2} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !form.name}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? "Save Changes" : "Create Fund"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null); setForm(blank); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {funds.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No funds configured. Create your first fund.
          </CardContent></Card>
        ) : funds.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="py-5 px-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base">{f.name}</h3>
                    <Badge className={`text-xs ${STATUS_COLOR[f.status] ?? ""}`}>{f.status}</Badge>
                    <span className="text-xs text-muted-foreground">Vintage {f.vintage}</span>
                  </div>
                  {f.strategy && <p className="text-sm text-muted-foreground mb-3 max-w-xl">{f.strategy}</p>}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">TVPI</p>
                      <p className="text-xl font-bold text-violet-600 mt-0.5">{fmtMultiple(f.tvpi)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">DPI</p>
                      <p className="text-xl font-bold text-emerald-600 mt-0.5">{fmtMultiple(f.dpi)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">RVPI</p>
                      <p className="text-xl font-bold text-blue-600 mt-0.5">{fmtMultiple(f.rvpi)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Net IRR</p>
                      <p className="text-xl font-bold text-amber-600 mt-0.5">{fmtPct(f.irr)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                    {f.fundSizeCad && <span><DollarSign className="h-3.5 w-3.5 inline" />Fund: ${fmt(f.fundSizeCad)}</span>}
                    {f.committedCapitalCad && <span>Committed: ${fmt(f.committedCapitalCad)}</span>}
                    {f.calledCapitalCad && <span>Called: ${fmt(f.calledCapitalCad)}</span>}
                    {f.navCad && <span>NAV: ${fmt(f.navCad)}</span>}
                    {f.managementFeePct && <span><Percent className="h-3.5 w-3.5 inline" />Mgmt: {f.managementFeePct}%</span>}
                    {f.carriedInterestPct && <span>Carry: {f.carriedInterestPct}%</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(f)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteFund(f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
