import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, CheckCircle2, XCircle, MinusCircle, Users, Pencil, Save, Trash2, HelpCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface IcMeeting {
  id: number;
  title: string;
  scheduledAt?: string;
  status: string;
  quorumReached: boolean;
  agenda?: string;
  notes?: string;
  minutesUrl?: string;
}

interface DealVote {
  id: number;
  vote: string;
  voterName?: string;
  dissentNote?: string;
}

interface MeetingDeal {
  id: number;
  dealId: number;
  companyName?: string;
  recommendation?: string;
  decisionReached: boolean;
  decisionNotes?: string;
  votes?: DealVote[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const VOTE_ICONS: Record<string, React.ReactNode> = {
  approve:   <CheckCircle2 className="h-4 w-4 text-green-500" />,
  reject:    <XCircle      className="h-4 w-4 text-red-500"   />,
  abstain:   <MinusCircle  className="h-4 w-4 text-gray-400"  />,
  more_info: <HelpCircle   className="h-4 w-4 text-amber-400" />,
};

export default function MPICMeetingDetail() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <ICMeetingDetailInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function ICMeetingDetailInner() {
  const [, params] = useRoute("/mp/ic-meetings/:id");
  const meetingId = params?.id;
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<IcMeeting | null>(null);
  const [deals, setDeals] = useState<MeetingDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);

  const [dealEdits, setDealEdits] = useState<Record<number, { recommendation: string; decisionNotes: string; decisionReached: boolean }>>({});
  const [savingDeal, setSavingDeal] = useState<Record<number, boolean>>({});
  const [removingDeal, setRemovingDeal] = useState<Record<number, boolean>>({});

  const fetchMeeting = () => {
    if (!meetingId) return;
    fetch(`${BASE}/api/ic/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setMeeting(d.meeting);
          setDeals(d.deals ?? []);
          const edits: typeof dealEdits = {};
          (d.deals ?? []).forEach((deal: MeetingDeal) => {
            edits[deal.id] = {
              recommendation: deal.recommendation ?? "",
              decisionNotes: deal.decisionNotes ?? "",
              decisionReached: deal.decisionReached,
            };
          });
          setDealEdits(edits);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMeeting(); }, [meetingId]);

  const markComplete = async () => {
    setUpdating(true);
    const res = await fetch(`${BASE}/api/ic/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      fetchMeeting();
      toast({ title: "Meeting marked as completed" });
    }
    setUpdating(false);
  };

  const saveMinutes = async () => {
    setSavingMinutes(true);
    const res = await fetch(`${BASE}/api/ic/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ notes: minutesDraft }),
    });
    if (res.ok) {
      toast({ title: "Minutes saved" });
      setEditingMinutes(false);
      fetchMeeting();
    } else {
      toast({ title: "Failed to save minutes", variant: "destructive" });
    }
    setSavingMinutes(false);
  };

  const saveDealEntry = async (dealEntry: MeetingDeal) => {
    setSavingDeal(s => ({ ...s, [dealEntry.id]: true }));
    const edit = dealEdits[dealEntry.id];
    const res = await fetch(`${BASE}/api/ic/meetings/${meetingId}/deals/${dealEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(edit),
    });
    if (res.ok) {
      toast({ title: "Deal entry updated" });
      fetchMeeting();
    } else {
      toast({ title: "Failed to update deal entry", variant: "destructive" });
    }
    setSavingDeal(s => ({ ...s, [dealEntry.id]: false }));
  };

  const removeDeal = async (dealEntry: MeetingDeal) => {
    if (!confirm(`Remove ${dealEntry.companyName ?? "this deal"} from the meeting?`)) return;
    setRemovingDeal(s => ({ ...s, [dealEntry.id]: true }));
    const res = await fetch(`${BASE}/api/ic/meetings/${meetingId}/deals/${dealEntry.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      toast({ title: "Deal removed from meeting" });
      fetchMeeting();
    } else {
      toast({ title: "Failed to remove deal", variant: "destructive" });
    }
    setRemovingDeal(s => ({ ...s, [dealEntry.id]: false }));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!meeting) return <div className="p-8 text-center text-muted-foreground">Meeting not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/mp/ic-meetings">
            <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            {meeting.scheduledAt && (
              <p className="text-muted-foreground text-sm">{new Date(meeting.scheduledAt).toLocaleString()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[meeting.status] ?? "bg-gray-100 text-gray-700"}>{meeting.status}</Badge>
          {meeting.status === "scheduled" && (
            <Button size="sm" onClick={markComplete} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Complete"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{deals.length}</p>
            <p className="text-sm text-muted-foreground">Deals on Agenda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{deals.filter(d => d.decisionReached).length}</p>
            <p className="text-sm text-muted-foreground">Decisions Reached</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={meeting.quorumReached ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              {meeting.quorumReached ? "Quorum Reached" : "No Quorum"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {meeting.agenda && (
        <Card>
          <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{meeting.agenda}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Meeting Minutes / Notes</CardTitle>
          {!editingMinutes ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setMinutesDraft(meeting.notes ?? ""); setEditingMinutes(true); }}>
              <Pencil className="h-3.5 w-3.5" /> Edit Minutes
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingMinutes(false)}>Cancel</Button>
              <Button size="sm" className="gradient-teal text-white border-0 gap-1.5" onClick={saveMinutes} disabled={savingMinutes}>
                {savingMinutes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingMinutes ? (
            <Textarea
              rows={6}
              value={minutesDraft}
              onChange={e => setMinutesDraft(e.target.value)}
              placeholder="Enter meeting minutes, key decisions, and action items…"
              className="text-sm"
            />
          ) : (
            meeting.notes
              ? <p className="text-sm whitespace-pre-wrap">{meeting.notes}</p>
              : <p className="text-sm text-muted-foreground italic">No minutes recorded yet. Click Edit Minutes to add notes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Deals Under Review</CardTitle></CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals added to this meeting yet</p>
          ) : (
            <div className="space-y-4">
              {deals.map(d => {
                const edit = dealEdits[d.id] ?? { recommendation: d.recommendation ?? "", decisionNotes: d.decisionNotes ?? "", decisionReached: d.decisionReached };
                return (
                  <div key={d.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{d.companyName}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                        disabled={removingDeal[d.id]}
                        onClick={() => removeDeal(d)}
                      >
                        {removingDeal[d.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remove
                      </Button>
                    </div>

                    {d.votes && d.votes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Votes</p>
                        {d.votes.map(v => (
                          <div key={v.id} className="flex items-center gap-2 text-sm">
                            {VOTE_ICONS[v.vote] ?? null}
                            <span className="font-medium">{v.voterName}</span>
                            <span className="text-muted-foreground capitalize">{v.vote.replace(/_/g, " ")}</span>
                            {v.dissentNote && <span className="text-red-600 text-xs italic">— {v.dissentNote}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Recommendation</label>
                        <select
                          className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                          value={edit.recommendation}
                          onChange={e => setDealEdits(de => ({ ...de, [d.id]: { ...edit, recommendation: e.target.value } }))}
                        >
                          <option value="">— None —</option>
                          <option value="invest">Invest</option>
                          <option value="pass">Pass</option>
                          <option value="more_due_diligence">More Due Diligence</option>
                          <option value="table">Table</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edit.decisionReached}
                            onChange={e => setDealEdits(de => ({ ...de, [d.id]: { ...edit, decisionReached: e.target.checked } }))}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm font-medium">Decision Reached</span>
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Decision Notes</label>
                        <Input
                          value={edit.decisionNotes}
                          onChange={e => setDealEdits(de => ({ ...de, [d.id]: { ...edit, decisionNotes: e.target.value } }))}
                          placeholder="Summary of IC decision…"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={savingDeal[d.id]}
                      onClick={() => saveDealEntry(d)}
                    >
                      {savingDeal[d.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Deal Entry
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
