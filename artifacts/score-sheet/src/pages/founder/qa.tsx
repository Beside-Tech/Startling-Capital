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
  MessageSquare, Plus, ChevronRight, ChevronDown, Send,
  CheckCircle2, Clock, Loader2, User, Shield,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

type Thread = {
  id: number;
  title: string;
  body: string;
  category: string;
  status: "open" | "answered" | "closed";
  isPinned: boolean;
  createdAt: string;
  authorName: string;
};

type Reply = {
  id: number;
  body: string;
  isStaffReply: boolean;
  createdAt: string;
  authorName: string;
};

const CATEGORIES = [
  { value: "general",  label: "General"   },
  { value: "program",  label: "Program"   },
  { value: "funding",  label: "Funding"   },
  { value: "legal",    label: "Legal"     },
  { value: "product",  label: "Product"   },
  { value: "market",   label: "Market"    },
  { value: "other",    label: "Other"     },
];

function statusBadge(status: string) {
  if (status === "answered") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50";
  if (status === "closed") return "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50";
}

function statusIcon(status: string) {
  if (status === "answered") return <CheckCircle2 className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

export default function QAPage() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <QAInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function QAInner() {
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general" });
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/founder/qa`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!replies[id]) {
      setLoadingReplies(true);
      const res = await fetch(`${BASE}/api/founder/qa/${id}/replies`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setReplies(r => ({ ...r, [id]: data.replies || [] }));
      }
      setLoadingReplies(false);
    }
  };

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setPosting(true);
    const res = await fetch(`${BASE}/api/founder/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setThreads(t => [data.thread, ...t]);
      setForm({ title: "", body: "", category: "general" });
      setShowForm(false);
      toast({ title: "Question posted" });
    } else {
      toast({ title: "Failed to post question", variant: "destructive" });
    }
    setPosting(false);
  };

  const handleReply = async (threadId: number) => {
    if (!replyBody.trim()) return;
    setReplying(true);
    const res = await fetch(`${BASE}/api/founder/qa/${threadId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ body: replyBody }),
    });
    if (res.ok) {
      const data = await res.json();
      setReplies(r => ({ ...r, [threadId]: [...(r[threadId] || []), data.reply] }));
      setThreads(t => t.map(th => th.id === threadId ? { ...th, status: "answered" as const } : th));
      setReplyBody("");
      toast({ title: "Reply posted" });
    } else {
      toast({ title: "Failed to post reply", variant: "destructive" });
    }
    setReplying(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Q&amp;A
          </h1>
          <p className="text-muted-foreground mt-1">Ask questions and get answers from the Startling Capital team.</p>
        </div>
        <Button className="gradient-teal text-white border-0 hover:opacity-90 gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4" /> Ask a Question
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
              <select
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question Title</label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief, descriptive title..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</label>
              <Textarea className="mt-1 min-h-[100px]" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Describe your question in detail..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="gradient-teal text-white border-0 hover:opacity-90" onClick={handlePost} disabled={posting}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No questions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Ask your first question above and the Startling Capital team will respond.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <Card key={thread.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-0">
                <button
                  className="w-full flex items-start gap-3 py-4 text-left"
                  onClick={() => handleExpand(thread.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{thread.title}</span>
                      <Badge className={`text-xs border ${statusBadge(thread.status)} gap-1`}>
                        {statusIcon(thread.status)}
                        {thread.status}
                      </Badge>
                      <Badge className="text-xs bg-secondary text-secondary-foreground">{thread.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{thread.body}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(thread.createdAt).toLocaleDateString("en-CA")}</p>
                  </div>
                  {expanded === thread.id ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                </button>

                {expanded === thread.id && (
                  <div className="border-t border-border pb-4 pt-3 space-y-3">
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{thread.body}</p>
                    </div>

                    {loadingReplies ? (
                      <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
                    ) : (replies[thread.id] || []).map(reply => (
                      <div key={reply.id} className={`flex gap-3 ${reply.isStaffReply ? "pl-0" : "pl-4"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${reply.isStaffReply ? "gradient-teal" : "bg-secondary"}`}>
                          {reply.isStaffReply ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <div className={`flex-1 rounded-xl p-3 ${reply.isStaffReply ? "bg-primary/5 border border-primary/10" : "bg-secondary/50"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">{reply.authorName || "Team"}</span>
                            {reply.isStaffReply && <Badge className="text-xs bg-primary/10 text-primary border-primary/20 border">Startling Capital Team</Badge>}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{reply.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(reply.createdAt).toLocaleDateString("en-CA")}</p>
                        </div>
                      </div>
                    ))}

                    {thread.status !== "closed" && (
                      <div className="flex gap-2 pt-1">
                        <Textarea
                          className="flex-1 min-h-[60px] text-sm"
                          placeholder="Add a comment or follow-up..."
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                        />
                        <Button
                          className="self-end gradient-teal text-white border-0 hover:opacity-90"
                          onClick={() => handleReply(thread.id)}
                          disabled={replying}
                        >
                          {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

