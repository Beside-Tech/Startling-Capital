import { useEffect, useState } from "react";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarCheck, Clock, CheckCircle2, X as XIcon, Video } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

function statusInfo(status: string) {
  if (status === "scheduled") return { label: "Scheduled", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200", icon: <CalendarCheck className="h-3 w-3" /> };
  if (status === "completed") return { label: "Completed", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50", icon: <CheckCircle2 className="h-3 w-3" /> };
  if (status === "cancelled") return { label: "Cancelled", cls: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600", icon: <XIcon className="h-3 w-3" /> };
  return { label: "Requested", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50", icon: <Clock className="h-3 w-3" /> };
}

const TOPIC_LABELS: Record<string, string> = {
  fundraising: "Fundraising", market_expansion: "Market Expansion", product: "Product",
  legal: "Legal", hr: "HR", marketing: "Marketing", other: "Other",
};

export default function MPAdvisory() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <AdvisoryInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function AdvisoryInner() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<number, { status: string; meetingUrl: string; notes: string; scheduledAt: string }>>({});

  useEffect(() => {
    fetch(`${BASE}/api/mp/advisory`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSessions(d?.sessions || []))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (s: any) => {
    setEditing(e => ({
      ...e,
      [s.id]: { status: s.status, meetingUrl: s.meetingUrl || "", notes: s.notes || "", scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 16) : "" }
    }));
  };

  const saveEdit = async (id: number) => {
    const { status, meetingUrl, notes, scheduledAt } = editing[id];
    const res = await fetch(`${BASE}/api/mp/advisory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status, meetingUrl: meetingUrl || null, notes: notes || null, scheduledAt: scheduledAt || null }),
    });
    if (res.ok) {
      setSessions(ss => ss.map(s => s.id === id ? { ...s, status, meetingUrl: meetingUrl || null, notes: notes || null, scheduledAt: scheduledAt || null } : s));
      setEditing(e => { const n = { ...e }; delete n[id]; return n; });
      toast({ title: "Session updated" });
    } else {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-primary" /> Advisory Sessions
        </h1>
        <p className="text-muted-foreground mt-1">Manage and schedule advisory sessions for portfolio founders.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Total Requests", value: sessions.length },
          { label: "Pending", value: sessions.filter(s => s.status === "requested").length },
          { label: "Scheduled", value: sessions.filter(s => s.status === "scheduled").length },
        ].map(s => (
          <Card key={s.label}><CardContent className="py-5"><div className="text-2xl font-bold">{s.value}</div><div className="text-sm text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No advisory session requests yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const { label, cls, icon } = statusInfo(session.status);
            const isEditing = editing[session.id];
            return (
              <Card key={session.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{session.founderCompany || session.founderName}</span>
                        <Badge className={`text-xs border gap-1 ${cls}`}>{icon}{label}</Badge>
                        <Badge className="bg-secondary text-secondary-foreground text-xs">{TOPIC_LABELS[session.topic] || session.topic}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{session.description}</p>
                      {session.preferredDate && session.status === "requested" && (
                        <p className="text-xs text-muted-foreground mt-0.5">Preferred: {session.preferredDate}</p>
                      )}
                      {!isEditing && session.meetingUrl && (
                        <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Video className="h-3 w-3" /> Meeting Link
                        </a>
                      )}
                      {!isEditing && session.notes && (
                        <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 rounded-lg p-2">{session.notes}</p>
                      )}

                      {isEditing ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                              <select
                                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background"
                                value={isEditing.status}
                                onChange={e => setEditing(ed => ({ ...ed, [session.id]: { ...isEditing, status: e.target.value } }))}
                              >
                                {["requested", "scheduled", "completed", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scheduled At</label>
                              <Input className="mt-1" type="datetime-local" value={isEditing.scheduledAt} onChange={e => setEditing(ed => ({ ...ed, [session.id]: { ...isEditing, scheduledAt: e.target.value } }))} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting URL</label>
                              <Input className="mt-1" value={isEditing.meetingUrl} onChange={e => setEditing(ed => ({ ...ed, [session.id]: { ...isEditing, meetingUrl: e.target.value } }))} placeholder="https://meet.google.com/..." />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes for founder</label>
                              <Input className="mt-1" value={isEditing.notes} onChange={e => setEditing(ed => ({ ...ed, [session.id]: { ...isEditing, notes: e.target.value } }))} placeholder="Session notes…" />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditing(e => { const n = { ...e }; delete n[session.id]; return n; })}>Cancel</Button>
                            <Button size="sm" className="gradient-teal text-white border-0 hover:opacity-90" onClick={() => saveEdit(session.id)}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => startEdit(session)}>
                          {session.status === "requested" ? "Schedule" : "Edit"}
                        </Button>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString("en-CA")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
