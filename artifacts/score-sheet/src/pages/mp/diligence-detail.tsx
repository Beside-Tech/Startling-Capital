import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { MPLayout } from "@/components/mp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, CheckCircle2, MessageSquare, Plus, ChevronDown, ChevronUp, Send } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

interface DiligenceChecklist {
  id: number;
  companyName?: string;
  dealId?: number;
  status?: string;
}

interface DiligenceItem {
  id: number;
  title: string;
  category?: string;
  status: string;
  notes?: string;
}

interface QaThread {
  id: number;
  subject: string;
  category: string;
  status: string;
  isPrivate: boolean;
  messageCount?: number;
  createdAt?: string;
}

interface QaMessage {
  id: number;
  body: string;
  authorName?: string;
  createdAt?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  legal: "bg-blue-100 text-blue-700",
  financial: "bg-green-100 text-green-700",
  technical: "bg-purple-100 text-purple-700",
  team: "bg-orange-100 text-orange-700",
  market: "bg-cyan-100 text-cyan-700",
  product: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export default function MPDiligenceDetail() {
  return (
    <ProtectedRoute mpOnly>
      <MPLayout>
        <DiligenceDetailInner />
      </MPLayout>
    </ProtectedRoute>
  );
}

function DiligenceDetailInner() {
  const [, params] = useRoute("/mp/diligence/:id");
  const checklistId = params?.id;
  const { toast } = useToast();
  const [data, setData] = useState<{ checklist: DiligenceChecklist; items: DiligenceItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const [threads, setThreads] = useState<QaThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [expandedThread, setExpandedThread] = useState<number | null>(null);
  const [threadMessages, setThreadMessages] = useState<Record<number, QaMessage[]>>({});
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<number, boolean>>({});

  const [showNewThread, setShowNewThread] = useState(false);
  const [newThread, setNewThread] = useState({ subject: "", category: "general", isPrivate: false });
  const [creatingThread, setCreatingThread] = useState(false);

  const fetchChecklist = () => {
    if (!checklistId) return;
    fetch(`${BASE}/api/diligence/checklists/${checklistId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setData(d);
        if (d?.checklist?.dealId) loadThreads(d.checklist.dealId);
      })
      .finally(() => setLoading(false));
  };

  const loadThreads = (dealId: number) => {
    setThreadsLoading(true);
    fetch(`${BASE}/api/diligence/threads/deal/${dealId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads ?? []))
      .finally(() => setThreadsLoading(false));
  };

  const loadMessages = (threadId: number) => {
    fetch(`${BASE}/api/diligence/threads/${threadId}/messages`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setThreadMessages(m => ({ ...m, [threadId]: d.messages ?? [] })));
  };

  const toggleThread = (threadId: number) => {
    if (expandedThread === threadId) {
      setExpandedThread(null);
    } else {
      setExpandedThread(threadId);
      if (!threadMessages[threadId]) loadMessages(threadId);
    }
  };

  const sendReply = async (threadId: number) => {
    const body = replyDraft[threadId]?.trim();
    if (!body) return;
    setSendingReply(s => ({ ...s, [threadId]: true }));
    const res = await fetch(`${BASE}/api/diligence/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setReplyDraft(r => ({ ...r, [threadId]: "" }));
      loadMessages(threadId);
    } else {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
    setSendingReply(s => ({ ...s, [threadId]: false }));
  };

  const createThread = async () => {
    if (!newThread.subject || !data?.checklist?.dealId) return;
    setCreatingThread(true);
    const res = await fetch(`${BASE}/api/diligence/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ dealId: data.checklist.dealId, ...newThread }),
    });
    if (res.ok) {
      toast({ title: "Thread created" });
      setShowNewThread(false);
      setNewThread({ subject: "", category: "general", isPrivate: false });
      if (data.checklist.dealId) loadThreads(data.checklist.dealId);
    } else {
      toast({ title: "Failed to create thread", variant: "destructive" });
    }
    setCreatingThread(false);
  };

  useEffect(() => { fetchChecklist(); }, [checklistId]);

  const toggleItem = async (itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "complete" ? "pending" : "complete";
    const res = await fetch(
      `${BASE}/api/diligence/checklists/${checklistId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    if (res.ok) {
      fetchChecklist();
      toast({ title: nextStatus === "complete" ? "Item marked complete" : "Item re-opened" });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Checklist not found</div>;

  const { checklist, items } = data;
  const completed = items.filter(i => i.status === "complete").length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const byCategory = items.reduce<Record<string, DiligenceItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/mp/deal-flow">
          <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{checklist.companyName ?? "Unknown Company"} — Due Diligence</h1>
          {checklist.status && <p className="text-muted-foreground text-sm capitalize">{checklist.status}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 bg-muted rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium w-20 text-right">{completed}/{items.length} ({pct}%)</span>
      </div>

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Badge>
              <span className="text-muted-foreground font-normal text-sm">{catItems.filter(i => i.status === "complete").length}/{catItems.length} complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {catItems.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <Checkbox
                    checked={item.status === "complete"}
                    onCheckedChange={() => toggleItem(item.id, item.status)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                  </div>
                  {item.status === "complete" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Diligence Q&A Threads
            {threadsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewThread(s => !s)}>
            <Plus className="h-3.5 w-3.5" /> New Thread
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showNewThread && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">New Q&A Thread</p>
              <Input
                placeholder="Thread subject…"
                value={newThread.subject}
                onChange={e => setNewThread(t => ({ ...t, subject: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Category</label>
                  <select
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                    value={newThread.category}
                    onChange={e => setNewThread(t => ({ ...t, category: e.target.value }))}
                  >
                    {["general", "legal", "financial", "technical", "team", "market", "product"].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newThread.isPrivate}
                      onChange={e => setNewThread(t => ({ ...t, isPrivate: e.target.checked }))}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">Private (IC only)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowNewThread(false)}>Cancel</Button>
                <Button size="sm" className="gradient-teal text-white border-0" disabled={!newThread.subject || creatingThread} onClick={createThread}>
                  {creatingThread ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Create Thread
                </Button>
              </div>
            </div>
          )}

          {threads.length === 0 && !showNewThread ? (
            <p className="text-sm text-muted-foreground">No Q&A threads yet. Start a thread to discuss a specific aspect of this deal.</p>
          ) : (
            threads.map(thread => (
              <div key={thread.id} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => toggleThread(thread.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`text-xs shrink-0 ${CATEGORY_COLORS[thread.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {thread.category}
                    </Badge>
                    <span className="text-sm font-medium truncate">{thread.subject}</span>
                    {thread.isPrivate && <Badge variant="outline" className="text-xs shrink-0">Private</Badge>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{thread.status}</span>
                    {expandedThread === thread.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                </button>

                {expandedThread === thread.id && (
                  <div className="border-t bg-muted/10 p-3 space-y-3">
                    {threadMessages[thread.id] ? (
                      threadMessages[thread.id].length === 0
                        ? <p className="text-xs text-muted-foreground italic">No messages yet.</p>
                        : threadMessages[thread.id].map(msg => (
                          <div key={msg.id} className="flex gap-3">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{(msg.authorName ?? "?")[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{msg.authorName ?? "Unknown"} <span className="text-muted-foreground font-normal">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</span></p>
                              <p className="text-sm whitespace-pre-wrap mt-0.5">{msg.body}</p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-2"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Textarea
                        rows={2}
                        className="text-sm flex-1"
                        placeholder="Write a message…"
                        value={replyDraft[thread.id] ?? ""}
                        onChange={e => setReplyDraft(r => ({ ...r, [thread.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(thread.id); }}
                      />
                      <Button
                        size="sm"
                        className="self-end gradient-teal text-white border-0"
                        disabled={!replyDraft[thread.id]?.trim() || sendingReply[thread.id]}
                        onClick={() => sendReply(thread.id)}
                      >
                        {sendingReply[thread.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
