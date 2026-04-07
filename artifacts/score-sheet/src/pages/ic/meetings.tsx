import { useState, useEffect } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, FileText, CheckCircle2, Clock, Users2, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ICMeetings() {
  return (
    <ProtectedRoute icOnly>
      <ICLayout><ICMeetingsInner /></ICLayout>
    </ProtectedRoute>
  );
}

function ICMeetingsInner() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/ic/meetings`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { meetings: [] })
      .then(d => setMeetings(d.meetings ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openMeeting(id: number) {
    setDetailLoading(true);
    fetch(`${BASE}/api/ic/meetings/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSelected(d.meeting); setDeals(d.deals ?? []); } })
      .finally(() => setDetailLoading(false));
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">IC Meetings</h1>
        <p className="text-muted-foreground mt-1">Investment Committee meeting packets and agendas.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {meetings.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No meetings scheduled yet.</CardContent></Card>
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
                    {m.createdByName && <p className="text-xs text-muted-foreground">by {m.createdByName}</p>}
                  </div>
                  <Badge className={`text-xs shrink-0 ${STATUS_COLOR[m.status] ?? ""}`}>{m.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-3">
          {detailLoading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : selected ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{selected.title}</CardTitle>
                    <Badge className={`text-xs ${STATUS_COLOR[selected.status] ?? ""}`}>{selected.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
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
                  {selected.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{selected.notes}</p>
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
                    <p className="text-sm text-muted-foreground">No deals added to this meeting.</p>
                  ) : deals.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="font-medium text-sm">{d.companyName}</p>
                        <p className="text-xs text-muted-foreground">{d.sector ?? "—"} · {d.pipelineStage}</p>
                      </div>
                      <div className="text-right">
                        {d.recommendation && (
                          <Badge variant="outline" className="text-xs">{d.recommendation}</Badge>
                        )}
                        {d.decisionReached && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><CheckCircle2 className="h-3 w-3" />Decision reached</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Select a meeting to view its packet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
