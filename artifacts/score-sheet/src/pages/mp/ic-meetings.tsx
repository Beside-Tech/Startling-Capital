import { useState, useEffect } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Calendar, Users2, CheckCircle2, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function MPICMeetings() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout><MPICMeetingsInner /></MPLayout>
    </ProtectedRoute>
  );
}

function MPICMeetingsInner() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "", agenda: "", status: "draft", notes: "" });

  const loadMeetings = () => {
    fetch(`${BASE}/api/ic/meetings`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { meetings: [] })
      .then(d => setMeetings(d.meetings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMeetings(); }, []);

  function openMeeting(id: number) {
    fetch(`${BASE}/api/ic/meetings/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSelected(d.meeting); setDeals(d.deals ?? []); } });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`${BASE}/api/ic/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setCreating(false);
    setForm({ title: "", scheduledAt: "", agenda: "", status: "draft", notes: "" });
    loadMeetings();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`${BASE}/api/ic/meetings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    loadMeetings();
    if (selected?.id === id) setSelected((p: any) => ({ ...p, status }));
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">IC Meetings</h1>
          <p className="text-muted-foreground mt-1">Manage Investment Committee meeting packets and decisions.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />New Meeting
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Schedule New Meeting</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Title *</label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Q2 2025 IC Meeting" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Scheduled Date</label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Agenda</label>
                <Textarea value={form.agenda} onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} placeholder="Meeting agenda, items to discuss..." rows={3} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Pre-meeting notes..." rows={2} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Meeting"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {meetings.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No meetings yet. Create your first one.</CardContent></Card>
          ) : meetings.map((m: any) => (
            <Card
              key={m.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${selected?.id === m.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => openMeeting(m.id)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "No date set"}
                    </p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${STATUS_COLOR[m.status] ?? ""}`}>{m.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg">{selected.title}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {selected.status !== "completed" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(selected.id, "completed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Complete
                        </Button>
                      )}
                      {selected.status === "draft" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(selected.id, "scheduled")}>
                          <Calendar className="h-3.5 w-3.5 mr-1" />Schedule
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium mt-0.5">
                        {selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleDateString("en-CA", { dateStyle: "long" }) : "TBD"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quorum</p>
                      <p className={`font-medium flex items-center gap-1.5 mt-0.5 ${selected.quorumReached ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <Users2 className="h-3.5 w-3.5" />
                        {selected.quorumReached ? "Reached" : "Pending"}
                      </p>
                    </div>
                  </div>
                  {selected.agenda && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Agenda</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{selected.agenda}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deals on Agenda ({deals.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deals added yet.</p>
                  ) : deals.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="font-medium text-sm">{d.companyName}</p>
                        <p className="text-xs text-muted-foreground">{d.sector ?? "—"} · {d.pipelineStage}</p>
                      </div>
                      {d.recommendation && <Badge variant="outline" className="text-xs">{d.recommendation}</Badge>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Select a meeting to view details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
