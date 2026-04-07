import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ChevronRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const INSTRUMENT_OPTIONS = ["Common", "Preferred", "SAFE", "Convertible Note", "Warrant", "Option"];
const TYPE_OPTIONS = ["founder", "investor", "employee", "advisor", "other"];

export default function AdminCapTable() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <AdminCapTableInner />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdminCapTableInner() {
  const { toast } = useToast();
  const [founders, setFounders] = useState<any[]>([]);
  const [selectedFounder, setSelectedFounder] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingFounders, setLoadingFounders] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ investorName: "", investorType: "investor", instrument: "Common", shares: "", equityPct: "", investmentAmountCad: "", roundName: "", date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/admin/cap-table`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setFounders(d))
      .finally(() => setLoadingFounders(false));
  }, []);

  const loadEntries = useCallback(async (founderId: number) => {
    setLoadingEntries(true);
    const r = await fetch(`${BASE}/api/admin/cap-table/${founderId}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (r.ok) setEntries(await r.json());
    setLoadingEntries(false);
  }, []);

  const selectFounder = (f: any) => {
    setSelectedFounder(f);
    loadEntries(f.founderId);
  };

  const addEntry = async () => {
    if (!form.investorName) return toast({ title: "Investor name required", variant: "destructive" });
    setSaving(true);
    const r = await fetch(`${BASE}/api/admin/cap-table/${selectedFounder.founderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, shares: form.shares || null, equityPct: form.equityPct || null, investmentAmountCad: form.investmentAmountCad || null }),
    });
    setSaving(false);
    if (r.ok) {
      toast({ title: "Entry added" });
      setShowAdd(false);
      setForm({ investorName: "", investorType: "investor", instrument: "Common", shares: "", equityPct: "", investmentAmountCad: "", roundName: "", date: "", notes: "" });
      loadEntries(selectedFounder.founderId);
    } else {
      toast({ title: "Failed to add entry", variant: "destructive" });
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`${BASE}/api/admin/cap-table/entry/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    toast({ title: "Deleted" });
    loadEntries(selectedFounder.founderId);
  };

  const totalEquity = entries.reduce((s, e) => s + (e.equityPct ? Number(e.equityPct) : 0), 0);
  const totalInvested = entries.reduce((s, e) => s + (e.investmentAmountCad ? Number(e.investmentAmountCad) : 0), 0);

  if (loadingFounders) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  if (!selectedFounder) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Cap Table</h1>
          <p className="text-muted-foreground mt-1">Select a startup to view or edit its cap table.</p>
        </div>
        {founders.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No founders in the system yet.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {founders.map(f => (
              <Card key={f.founderId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectFounder(f)}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">{f.companyName}</p>
                    <p className="text-sm text-muted-foreground">{f.sector} · {f.stage}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedFounder(null)} className="text-sm text-muted-foreground hover:underline">Cap Table</button>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-bold font-display">{selectedFounder.companyName}</h1>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>{selectedFounder.sector}</span>
            <span>{selectedFounder.stage}</span>
            {totalEquity > 0 && <span>{totalEquity.toFixed(1)}% equity tracked</span>}
            {totalInvested > 0 && <span>${totalInvested.toLocaleString()} CAD invested</span>}
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
      </div>

      {loadingEntries ? (
        <div className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No cap table entries yet.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-4 py-3">Investor</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Instrument</th>
                  <th className="text-left px-4 py-3">Round</th>
                  <th className="text-right px-4 py-3">Shares</th>
                  <th className="text-right px-4 py-3">Equity %</th>
                  <th className="text-right px-4 py-3">Amount (CAD)</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{e.investorName}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{e.investorType}</Badge></td>
                    <td className="px-4 py-3">{e.instrument}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.roundName ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{e.shares ? Number(e.shares).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-right">{e.equityPct ? `${Number(e.equityPct).toFixed(2)}%` : "—"}</td>
                    <td className="px-4 py-3 text-right">{e.investmentAmountCad ? `$${Number(e.investmentAmountCad).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEntry(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-semibold text-sm">
                <tr>
                  <td className="px-4 py-2" colSpan={5}>Total</td>
                  <td className="px-4 py-2 text-right">{totalEquity > 0 ? `${totalEquity.toFixed(2)}%` : "—"}</td>
                  <td className="px-4 py-2 text-right">{totalInvested > 0 ? `$${totalInvested.toLocaleString()}` : "—"}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Cap Table Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Investor / Holder Name</Label>
              <Input placeholder="Nobellum Ventures" value={form.investorName} onChange={e => setForm(f => ({ ...f, investorName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.investorType} onValueChange={v => setForm(f => ({ ...f, investorType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instrument</Label>
              <Select value={form.instrument} onValueChange={v => setForm(f => ({ ...f, instrument: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSTRUMENT_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Round</Label>
              <Input placeholder="Seed" value={form.roundName} onChange={e => setForm(f => ({ ...f, roundName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Shares</Label>
              <Input type="number" placeholder="1000000" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Equity %</Label>
              <Input type="number" step="0.01" placeholder="10.5" value={form.equityPct} onChange={e => setForm(f => ({ ...f, equityPct: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Investment Amount (CAD)</Label>
              <Input type="number" placeholder="250000" value={form.investmentAmountCad} onChange={e => setForm(f => ({ ...f, investmentAmountCad: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEntry} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
