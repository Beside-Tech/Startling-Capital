import { useEffect, useState } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink, Plus, CalendarCheck, Clock, CheckCircle2,
  Loader2, Video, Send, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

type Session = {
  id: number;
  topic: string;
  description: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  scheduledAt: string | null;
  meetingUrl: string | null;
  notes: string | null;
  createdAt: string;
  advisorName: string | null;
};

const TOPICS = [
  { value: "fundraising",       label: "Fundraising Strategy"   },
  { value: "market_expansion",  label: "Market Expansion"        },
  { value: "product",           label: "Product Development"     },
  { value: "legal",             label: "Legal & Compliance"      },
  { value: "hr",                label: "Team & HR"               },
  { value: "marketing",         label: "Marketing & Growth"      },
  { value: "other",             label: "Other"                   },
];

function statusInfo(status: string) {
  if (status === "scheduled") return { label: "Scheduled", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200", icon: <CalendarCheck className="h-3 w-3" /> };
  if (status === "completed") return { label: "Completed", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50", icon: <CheckCircle2 className="h-3 w-3" /> };
  if (status === "cancelled") return { label: "Cancelled", cls: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600", icon: <X className="h-3 w-3" /> };
  return { label: "Requested", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50", icon: <Clock className="h-3 w-3" /> };
}

function topicLabel(v: string) {
  return TOPICS.find(t => t.value === v)?.label ?? v;
}

export default function AdvisoryPage() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <AdvisoryInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function AdvisoryInner() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ topic: "other", description: "", preferredDate: "", preferredTime: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/founder/advisory`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(d => setSessions(d.sessions || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.description.trim()) return;
    setPosting(true);
    const res = await fetch(`${BASE}/api/founder/advisory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setSessions(s => [data.session, ...s]);
      setForm({ topic: "other", description: "", preferredDate: "", preferredTime: "" });
      setShowForm(false);
      toast({ title: "Advisory session requested" });
    } else {
      toast({ title: "Failed to submit request", variant: "destructive" });
    }
    setPosting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-primary" />
            Advisory Services
          </h1>
          <p className="text-muted-foreground mt-1">Request 1-on-1 sessions with Nobellum advisors and mentors.</p>
        </div>
        <Button className="gradient-teal text-white border-0 hover:opacity-90 gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4" /> Request Session
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Advisory Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic Area</label>
              <select
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              >
                {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What would you like help with?</label>
              <Textarea
                className="mt-1 min-h-[100px]"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe your specific challenge or goals for this session..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred Date</label>
                <Input className="mt-1" type="date" value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred Time</label>
                <Input className="mt-1" type="time" value={form.preferredTime} onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="gradient-teal text-white border-0 hover:opacity-90" onClick={handleSubmit} disabled={posting}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No sessions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Request your first advisory session to connect with a Nobellum advisor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const { label, cls, icon } = statusInfo(session.status);
            return (
              <Card key={session.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{topicLabel(session.topic)}</span>
                        <Badge className={`text-xs border gap-1 ${cls}`}>{icon}{label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{session.description}</p>
                      {session.advisorName && (
                        <p className="text-xs text-muted-foreground mt-1">Advisor: <span className="font-medium text-foreground">{session.advisorName}</span></p>
                      )}
                      {session.scheduledAt && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <CalendarCheck className="h-3 w-3" />
                          {new Date(session.scheduledAt).toLocaleString("en-CA")}
                        </p>
                      )}
                      {session.meetingUrl && (
                        <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Video className="h-3 w-3" /> Join Meeting
                        </a>
                      )}
                      {session.notes && (
                        <div className="mt-2 bg-secondary/50 rounded-lg p-2">
                          <p className="text-xs text-foreground">{session.notes}</p>
                        </div>
                      )}
                      {session.preferredDate && session.status === "requested" && (
                        <p className="text-xs text-muted-foreground mt-1">Preferred: {session.preferredDate} {session.preferredTime && `at ${session.preferredTime}`}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Requested {new Date(session.createdAt).toLocaleDateString("en-CA")}</p>
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
