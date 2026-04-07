import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, FileSignature, DollarSign, Percent, CheckSquare } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface TermSheet {
  id: number;
  dealId?: number;
  companyName?: string;
  status: string;
  version?: number;
  instrument?: string;
  investmentAmountCad?: string;
  valuationPreMoneyCad?: string;
  equityPct?: string;
  discountRate?: string;
  proRataRights?: boolean;
  boardSeat?: boolean;
  informationRights?: boolean;
  expiryDate?: string;
  notes?: string;
}

interface DealOption {
  id: number;
  companyName: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  negotiating: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  withdrawn: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function MPTermSheet() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout><MPTermSheetInner /></MPLayout>
    </ProtectedRoute>
  );
}

function MPTermSheetInner() {
  const [sheets, setSheets] = useState<TermSheet[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dealId: "", instrument: "SAFE", valuationPreMoneyCad: "", investmentAmountCad: "",
    equityPct: "", discountRate: "", valuationCap: "", proRataRights: false,
    boardSeat: false, informationRights: true, closingConditions: "", expiryDate: "", notes: "",
  });

  const load = () => {
    Promise.all([
      fetch(`${BASE}/api/mp/term-sheets`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : { sheets: [] }),
      fetch(`${BASE}/api/ic/deals`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : { deals: [] }),
    ]).then(([s, d]) => {
      setSheets(s.sheets ?? []);
      setDeals(d.deals ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dealId) return;
    setSaving(true);
    await fetch(`${BASE}/api/mp/term-sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        ...form,
        proRataRights: Boolean(form.proRataRights),
        boardSeat: Boolean(form.boardSeat),
        informationRights: Boolean(form.informationRights),
      }),
    });
    setSaving(false);
    setCreating(false);
    load();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`${BASE}/api/mp/term-sheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    setSheets(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Term Sheet Modeler</h1>
          <p className="text-muted-foreground mt-1">Draft, negotiate, and track investment term sheets.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />New Term Sheet
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Draft Term Sheet</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Deal / Company *</label>
                  <select
                    value={form.dealId}
                    onChange={e => setForm(p => ({ ...p, dealId: e.target.value }))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">Select deal...</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Instrument</label>
                  <select
                    value={form.instrument}
                    onChange={e => setForm(p => ({ ...p, instrument: e.target.value }))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    {["SAFE", "Convertible Note", "Priced Round", "Equity"].map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Pre-Money Valuation (CAD)</label>
                  <Input type="number" value={form.valuationPreMoneyCad} onChange={e => setForm(p => ({ ...p, valuationPreMoneyCad: e.target.value }))} placeholder="5000000" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Investment Amount (CAD)</label>
                  <Input type="number" value={form.investmentAmountCad} onChange={e => setForm(p => ({ ...p, investmentAmountCad: e.target.value }))} placeholder="500000" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Equity %</label>
                  <Input type="number" step="0.001" value={form.equityPct} onChange={e => setForm(p => ({ ...p, equityPct: e.target.value }))} placeholder="9.09" className="mt-1" />
                </div>
              </div>
              {(form.instrument === "SAFE" || form.instrument === "Convertible Note") && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Discount Rate %</label>
                    <Input type="number" value={form.discountRate} onChange={e => setForm(p => ({ ...p, discountRate: e.target.value }))} placeholder="20" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Valuation Cap (CAD)</label>
                    <Input type="number" value={form.valuationCap} onChange={e => setForm(p => ({ ...p, valuationCap: e.target.value }))} placeholder="10000000" className="mt-1" />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {[
                  { key: "proRataRights", label: "Pro-Rata Rights" },
                  { key: "boardSeat", label: "Board Seat" },
                  { key: "informationRights", label: "Information Rights" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form[key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Expiry Date</label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Closing Conditions</label>
                  <Input value={form.closingConditions} onChange={e => setForm(p => ({ ...p, closingConditions: e.target.value }))} placeholder="Board approval, legal review..." className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !form.dealId}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Term Sheet"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {sheets.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No term sheets yet. Create your first one.
          </CardContent></Card>
        ) : sheets.map(s => (
          <Card key={s.id}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{s.companyName ?? "—"}</p>
                    <Badge className={`text-xs ${STATUS_COLOR[s.status] ?? ""}`}>{s.status}</Badge>
                    <span className="text-xs text-muted-foreground">v{s.version}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{s.instrument}</span>
                    {s.investmentAmountCad && <span>${Number(s.investmentAmountCad).toLocaleString()} CAD</span>}
                    {s.valuationPreMoneyCad && <span>Pre: ${Number(s.valuationPreMoneyCad).toLocaleString()}</span>}
                    {s.equityPct && <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" />{s.equityPct}%</span>}
                    {s.discountRate && <span>{s.discountRate}% discount</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {s.proRataRights && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckSquare className="h-3 w-3" />Pro-Rata</span>}
                    {s.boardSeat && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckSquare className="h-3 w-3" />Board Seat</span>}
                    {s.informationRights && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckSquare className="h-3 w-3" />Info Rights</span>}
                    {s.expiryDate && <span className="text-xs text-muted-foreground">Expires {s.expiryDate}</span>}
                  </div>
                </div>
                {s.status === "draft" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(s.id, "sent")}>Send</Button>
                  </div>
                )}
                {s.status === "sent" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(s.id, "negotiating")}>Negotiating</Button>
                    <Button variant="outline" size="sm" className="text-xs text-emerald-700 border-emerald-200" onClick={() => updateStatus(s.id, "signed")}>Signed</Button>
                  </div>
                )}
                {s.status === "negotiating" && (
                  <Button size="sm" className="text-xs" onClick={() => updateStatus(s.id, "signed")}>Mark Signed</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
