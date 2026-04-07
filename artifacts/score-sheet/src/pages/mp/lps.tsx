import { useEffect, useState } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Plus, DollarSign } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const INVESTOR_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "family_office", label: "Family Office" },
  { value: "institutional", label: "Institutional" },
  { value: "corporate", label: "Corporate" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

function typeLabel(v: string) {
  return INVESTOR_TYPES.find(t => t.value === v)?.label ?? v;
}

export default function MPLPs() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <LPsInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function LPsInner() {
  const { toast } = useToast();
  const [lps, setLps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: "", firmName: "", contactName: "", commitmentCad: "", investorType: "individual", country: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/mp/lps`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setLps(d?.lps || []))
      .finally(() => setLoading(false));
  }, []);

  const totalCommitted = lps.filter(l => l.active).reduce((s, l) => s + Number(l.commitmentCad || 0), 0);
  const totalCalled = lps.filter(l => l.active).reduce((s, l) => s + Number(l.capitalCalledCad || 0), 0);

  const createLP = async (): Promise<void> => {
    if (!form.userId) { toast({ title: "User ID required", variant: "destructive" }); return; }
    setCreating(true);
    const res = await fetch(`${BASE}/api/mp/lps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setLps(l => [...l, data.lp]);
      setShowForm(false);
      setForm({ userId: "", firmName: "", contactName: "", commitmentCad: "", investorType: "individual", country: "" });
      toast({ title: "LP profile created" });
    } else {
      toast({ title: "Failed to create LP", variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Limited Partners
          </h1>
          <p className="text-muted-foreground mt-1">Manage LP relationships and capital commitments.</p>
        </div>
        <Button className="gradient-teal text-white border-0 hover:opacity-90 gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4" /> Add LP
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active LPs", value: lps.filter(l => l.active).length },
          { label: "Total Committed (CAD)", value: totalCommitted > 0 ? `$${totalCommitted.toLocaleString()}` : "—" },
          { label: "Capital Called (CAD)", value: totalCalled > 0 ? `$${totalCalled.toLocaleString()}` : "—" },
        ].map(s => (
          <Card key={s.label}><CardContent className="py-5"><div className="text-2xl font-bold">{s.value}</div><div className="text-sm text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New LP Profile</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User ID (from Team & Access)</label>
              <Input className="mt-1" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} placeholder="User ID number" />
            </div>
            {[
              { key: "firmName", label: "Firm / Organization", placeholder: "Acme Capital" },
              { key: "contactName", label: "Contact Name", placeholder: "Jane Smith" },
              { key: "commitmentCad", label: "Commitment (CAD)", placeholder: "500000" },
              { key: "country", label: "Country", placeholder: "Canada" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
                <Input className="mt-1" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Investor Type</label>
              <select className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background" value={form.investorType} onChange={e => setForm(f => ({ ...f, investorType: e.target.value }))}>
                {INVESTOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="gradient-teal text-white border-0 hover:opacity-90" onClick={createLP} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create LP Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : lps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No LP profiles yet. Add your first limited partner above.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {lps.map(lp => (
            <Card key={lp.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{lp.firmName || lp.contactName || lp.userName}</span>
                      <Badge className="bg-secondary text-secondary-foreground text-xs">{typeLabel(lp.investorType)}</Badge>
                      {!lp.active && <Badge className="bg-red-100 text-red-800 border-red-200 border text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{[lp.email, lp.country].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {lp.commitmentCad && <p className="text-sm font-bold">CAD {Number(lp.commitmentCad).toLocaleString()}</p>}
                    {lp.capitalCalledCad && <p className="text-xs text-muted-foreground">Called: {Number(lp.capitalCalledCad).toLocaleString()}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
