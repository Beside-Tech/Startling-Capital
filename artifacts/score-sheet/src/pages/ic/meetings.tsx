import { useState, useEffect } from "react";
import { ICLayout } from "@/components/ic-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, FileText, CheckCircle2, XCircle, MinusCircle, HelpCircle, Users2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface Meeting {
  id: number;
  title: string;
  scheduledAt?: string;
  status: string;
  quorumReached: boolean;
  agenda?: string;
  notes?: string;
  createdByName?: string;
}

interface MeetingDeal {
  id: number;
  dealId: number;
  companyName?: string;
  sector?: string;
  pipelineStage?: string;
  recommendation?: string;
  decisionReached: boolean;
  votes?: Array<{
    id: number;
    vote: string;
    voterName?: string;
    dissentNote?: string;
  }>;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const VOTE_OPTIONS = [
  { value: "approve",   label: "Approve",   icon: CheckCircle2, cls: "text-emerald-600 border-emerald-300 hover:bg-emerald-50" },
  { value: "reject",    label: "Reject",    icon: XCircle,      cls: "text-red-600 border-red-300 hover:bg-red-50"             },
  { value: "abstain",   label: "Abstain",   icon: MinusCircle,  cls: "text-gray-500 border-gray-300 hover:bg-gray-50"          },
  { value: "more_info", label: "More Info", icon: HelpCircle,   cls: "text-amber-600 border-amber-300 hover:bg-amber-50"       },
] as const;

const VOTE_ICON_MAP: Record<string, React.ReactNode> = {
  approve:   <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  reject:    <XCircle      className="h-3.5 w-3.5 text-red-500"     />,
  abstain:   <MinusCircle  className="h-3.5 w-3.5 text-gray-400"    />,
  more_info: <HelpCircle   className="h-3.5 w-3.5 text-amber-500"   />,
};

export default function ICMeetings() {
  return (
    <ProtectedRoute icOnly>
      <ICLayout><ICMeetingsInner /></ICLayout>
    </ProtectedRoute>
  );
}

function ICMeetingsInner() {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [deals, setDeals] = useState<MeetingDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voting, setVoting] = useState<Record<number, boolean>>({});
  const [voteForm, setVoteForm] = useState<Record<number, { vote: string; dissentNote: string }>>({});

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
      .then(d => {
        if (d) {
          setSelected(d.meeting);
          setDeals(d.deals ?? []);
          const initialForms: Record<number, { vote: string; dissentNote: string }> = {};
          (d.deals as MeetingDeal[] ?? []).forEach((deal) => {
            initialForms[deal.dealId] = { vote: "", dissentNote: "" };
          });
          setVoteForm(initialForms);
        }
      })
      .finally(() => setDetailLoading(false));
  }

  const submitVote = async (dealId: number) => {
    const form = voteForm[dealId];
    if (!form?.vote) {
      toast({ title: "Please select a vote option", variant: "destructive" });
      return;
    }
    setVoting(v => ({ ...v, [dealId]: true }));
    const res = await fetch(`${BASE}/api/ic/votes/${dealId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ vote: form.vote, dissentNote: form.dissentNote || undefined, meetingId: selected?.id }),
    });
    if (res.ok) {
      toast({ title: "Vote submitted" });
      if (selected) openMeeting(selected.id);
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error ?? "Failed to submit vote", variant: "destructive" });
    }
    setVoting(v => ({ ...v, [dealId]: false }));
  };

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
          ) : meetings.map((m) => (
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
                      <p className="text-xs text-muted-foreground mb-1">Meeting Notes</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{selected.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deals on Agenda ({deals.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deals added to this meeting.</p>
                  ) : deals.map((d) => (
                    <div key={d.id} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{d.companyName}</p>
                          <p className="text-xs text-muted-foreground">{d.sector ?? "—"} · {d.pipelineStage?.replace(/_/g, " ")}</p>
                        </div>
                        <div className="text-right space-y-1">
                          {d.recommendation && (
                            <Badge variant="outline" className="text-xs">{d.recommendation.replace(/_/g, " ")}</Badge>
                          )}
                          {d.decisionReached && (
                            <p className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                              <CheckCircle2 className="h-3 w-3" />Decision reached
                            </p>
                          )}
                        </div>
                      </div>

                      {d.votes && d.votes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Votes</p>
                          {d.votes!.map((v) => (
                            <div key={v.id} className="flex items-center gap-2 text-xs">
                              {VOTE_ICON_MAP[v.vote] ?? null}
                              <span className="font-medium">{v.voterName ?? "IC Member"}</span>
                              <span className="text-muted-foreground capitalize">{v.vote.replace(/_/g, " ")}</span>
                              {v.dissentNote && <span className="text-red-500 italic">— {v.dissentNote}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {selected.status === "scheduled" && (
                        <div className="space-y-2 pt-1 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cast Your Vote</p>
                          <div className="flex gap-2 flex-wrap">
                            {VOTE_OPTIONS.map(opt => {
                              const Icon = opt.icon;
                              const isSelected = voteForm[d.dealId]?.vote === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setVoteForm(f => ({ ...f, [d.dealId]: { ...f[d.dealId], vote: opt.value } }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isSelected ? "bg-primary/10 border-primary text-primary" : opt.cls}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {(voteForm[d.dealId]?.vote === "reject" || voteForm[d.dealId]?.vote === "more_info") && (
                            <Textarea
                              rows={2}
                              placeholder="Add a note (required for reject / more info)…"
                              className="text-xs"
                              value={voteForm[d.dealId]?.dissentNote ?? ""}
                              onChange={e => setVoteForm(f => ({ ...f, [d.dealId]: { ...f[d.dealId], dissentNote: e.target.value } }))}
                            />
                          )}
                          <Button
                            size="sm"
                            className="gradient-teal text-white border-0 hover:opacity-90"
                            disabled={!voteForm[d.dealId]?.vote || voting[d.dealId]}
                            onClick={() => submitVote(d.dealId)}
                          >
                            {voting[d.dealId] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Submit Vote
                          </Button>
                        </div>
                      )}
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
