import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, CheckCircle2, XCircle, MinusCircle, Users } from "lucide-react";

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
  approve: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  reject: <XCircle className="h-4 w-4 text-red-500" />,
  abstain: <MinusCircle className="h-4 w-4 text-gray-400" />,
  more_info: <MinusCircle className="h-4 w-4 text-amber-400" />,
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!meeting) return <div className="p-8 text-center text-muted-foreground">Meeting not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
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
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Deals Under Review</CardTitle></CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals added to this meeting yet</p>
          ) : (
            <div className="space-y-4">
              {deals.map(d => (
                <div key={d.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{d.companyName}</p>
                    {d.recommendation && (
                      <Badge variant="outline">{d.recommendation.replace("_", " ")}</Badge>
                    )}
                  </div>
                  {d.votes && d.votes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Votes</p>
                      {d.votes.map(v => (
                        <div key={v.id} className="flex items-center gap-2 text-sm">
                          {VOTE_ICONS[v.vote] ?? null}
                          <span className="font-medium">{v.voterName}</span>
                          <span className="text-muted-foreground capitalize">{v.vote.replace("_", " ")}</span>
                          {v.dissentNote && <span className="text-red-600 text-xs italic">— {v.dissentNote}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {d.decisionNotes && (
                    <p className="text-sm text-muted-foreground italic">{d.decisionNotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {meeting.notes && (
        <Card>
          <CardHeader><CardTitle>Meeting Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{meeting.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
