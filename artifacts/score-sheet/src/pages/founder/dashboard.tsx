import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/lib/auth";
import { FounderLayout } from "@/components/founder-layout";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Rocket,
  Database,
  MessageSquare,
  Star,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Bell,
  ChevronRight,
  Plus,
  Globe,
  ExternalLink,
  AlertCircle,
  Quote,
  Send,
  RefreshCw,
  Briefcase,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type MyTestimonial = {
  id: number;
  content: string;
  programName: string | null;
  cohortYear: string | null;
  isActive: boolean;
  submittedAt: string;
};

function TestimonialsSection() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<MyTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [programName, setProgramName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("auth_token") ?? "";

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/founder/testimonials`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setTestimonials)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({ title: "Please write your testimonial first", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/founder/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: content.trim(), programName: programName || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }
      toast({ title: "Testimonial submitted!", description: "Your story is under review. We'll notify you when it's published." });
      setContent("");
      setProgramName("");
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Quote className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Share Your Story</CardTitle>
        </div>
        <CardDescription>Submit a testimonial — our team will curate the best ones for the homepage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing testimonials */}
        {testimonials.length > 0 && (
          <div className="space-y-2">
            {testimonials.map(t => (
              <div key={t.id} className={`rounded-xl p-3 border text-xs ${t.isActive ? "bg-teal-500/5 border-teal-500/20" : "bg-secondary/40 border-border"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[10px] ${t.isActive ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20" : "bg-secondary text-muted-foreground border-border"}`}>
                    {t.isActive ? "✓ Published" : "Pending Review"}
                  </Badge>
                  {t.programName && <span className="text-muted-foreground">{t.programName}</span>}
                </div>
                <p className="text-foreground leading-relaxed line-clamp-2">"{t.content}"</p>
              </div>
            ))}
          </div>
        )}

        {/* Submission form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Program (optional)</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
            >
              <option value="">Select a program...</option>
              <option value="Innovator Program">Innovator Program</option>
              <option value="WISE Women">WISE Women</option>
              <option value="CEI Global">CEI Global</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Your testimonial</label>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Share your experience with Nobellum Programs — what impact did it have on your business?"
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">{content.length}/500</p>
          </div>
          <Button
            size="sm"
            className="w-full gap-2 gradient-teal text-white border-0 hover:opacity-90"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit Testimonial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function useVenturesStatus() {
  const token = localStorage.getItem("auth_token") ?? "";
  const [status, setStatus] = useState<{ isPortfolio: boolean; status: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/founder/ventures/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  return status;
}

function WelcomeBanner({ name }: { name: string }) {
  const [, navigate] = useLocation();
  const firstName = name.split(" ")[0];
  const ventures = useVenturesStatus();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 sm:p-8 text-white mb-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <p className="text-white/70 text-sm mb-1">{greeting} 👋</p>
        {ventures?.isPortfolio && (
          <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-3 py-1 mb-2">
            <Briefcase className="h-3 w-3 text-yellow-300" />
            <span className="text-xs font-semibold text-yellow-200 tracking-wide">
              {ventures.status === "exited" ? "Nobellum Ventures Alumni" : "Nobellum Ventures Portfolio Company"}
            </span>
          </div>
        )}
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
          {firstName}, your journey continues
        </h1>
        <p className="text-white/75 text-sm mb-5 max-w-md">
          You have active programs to explore and your data room is waiting for updates. Keep building.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            className="bg-white text-primary hover:bg-white/90 font-semibold gap-2"
            onClick={() => navigate("/founder/apply")}
          >
            <Rocket className="h-3.5 w-3.5" /> Browse Programs
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 gap-2"
            onClick={() => navigate("/founder/data-room")}
          >
            <Database className="h-3.5 w-3.5" /> My Data Room
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApplicationCard({ app }: {
  app: {
    id: number;
    program: string;
    cohort: string;
    status: string;
    submittedAt?: string;
    score?: number;
    feedback?: string;
  };
}) {
  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    draft: { label: "Draft", color: "bg-secondary text-muted-foreground", icon: FileText },
    submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: Clock },
    under_review: { label: "Under Review", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", icon: Star },
    shortlisted: { label: "Shortlisted ✦", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: TrendingUp },
    accepted: { label: "Accepted! 🎉", color: "bg-green-500/10 text-green-600 dark:text-green-400", icon: CheckCircle2 },
    rejected: { label: "Not Selected", color: "bg-secondary text-muted-foreground", icon: AlertCircle },
    withdrawn: { label: "Withdrawn", color: "bg-secondary text-muted-foreground", icon: AlertCircle },
  };

  const cfg = statusConfig[app.status] || statusConfig.submitted;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors card-hover">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{app.program}</h3>
          <p className="text-xs text-muted-foreground">{app.cohort}</p>
        </div>
        <Badge className={`text-xs ${cfg.color} border-transparent shrink-0`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {cfg.label}
        </Badge>
      </div>

      {app.score !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Score</span>
            <span className="font-semibold text-foreground">{app.score}%</span>
          </div>
          <Progress value={app.score} className="h-1.5" />
        </div>
      )}

      {app.feedback && (
        <p className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-2.5 leading-relaxed">
          💬 {app.feedback}
        </p>
      )}

      {app.submittedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Submitted {app.submittedAt}
        </p>
      )}
    </div>
  );
}

const DATA_ROOM_CATEGORIES: { key: string; name: string }[] = [
  { key: "pitch_deck", name: "Pitch Deck" },
  { key: "financial_model", name: "Financial Model" },
  { key: "legal", name: "Legal Docs" },
  { key: "team", name: "Team Bios" },
  { key: "market_research", name: "Market Research" },
  { key: "product", name: "Product Demo" },
];

function DataRoomStatus() {
  const [, navigate] = useLocation();
  const token = localStorage.getItem("auth_token") ?? "";
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/founder/data-room`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then(({ files }: { files: { category: string }[] }) => {
        const counts: Record<string, number> = {};
        for (const f of files) {
          counts[f.category] = (counts[f.category] ?? 0) + 1;
        }
        setFileCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = DATA_ROOM_CATEGORIES.map((c) => ({
    ...c,
    count: fileCounts[c.key] ?? 0,
    filled: (fileCounts[c.key] ?? 0) > 0,
  }));

  const filled = categories.filter((c) => c.filled).length;
  const pct = loading ? 0 : Math.round((filled / categories.length) * 100);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Data Room</CardTitle>
            <CardDescription>Investor-ready document vault</CardDescription>
          </div>
          <Badge className={`text-xs ${pct >= 80 ? "bg-green-500/10 text-green-600" : pct >= 50 ? "bg-yellow-500/10 text-yellow-600" : "bg-red-500/10 text-red-600"} border-transparent`}>
            {pct}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={pct} className="h-2 mb-4" />

        <div className="space-y-2 mb-4">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {cat.filled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-border" />
                )}
                <span className={cat.filled ? "text-foreground" : "text-muted-foreground"}>
                  {cat.name}
                </span>
              </div>
              <span className="text-muted-foreground">{cat.count > 0 ? `${cat.count} file${cat.count > 1 ? "s" : ""}` : "Empty"}</span>
            </div>
          ))}
        </div>

        {pct < 80 && (
          <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-3 mb-3">
            <div className="flex gap-2">
              <Bell className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                Complete your data room to be investor-ready. LP review requires at least 80% completion.
              </p>
            </div>
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => navigate("/founder/data-room")}>
          <Plus className="h-3.5 w-3.5" /> Update Data Room
        </Button>
      </CardContent>
    </Card>
  );
}

function AdvisoryLinks() {
  const links = [
    { title: "Book a Mentorship Session", description: "1:1 with Nobellum advisors", url: "#", icon: Star },
    { title: "Investor Pitch Workshop", description: "Next session: April 15", url: "#", icon: TrendingUp },
    { title: "Legal Resources Hub", description: "Templates, guides & more", url: "#", icon: FileText },
    { title: "Founder Community", description: "Connect with peers", url: "#", icon: Globe },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Advisory Services</CardTitle>
        <CardDescription>Resources curated for your stage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links.map((link) => (
            <a
              key={link.title}
              href={link.url}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <link.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{link.title}</div>
                <div className="text-xs text-muted-foreground">{link.description}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type MyApplication = {
  id: number;
  programId: string;
  cohortId: string;
  status: string;
  submittedAt?: string | null;
  reviewNotes?: string | null;
  programName?: string | null;
  cohortName?: string | null;
  cohortYear?: number | null;
};

function useMyApplications() {
  const token = localStorage.getItem("auth_token") ?? "";
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/founder/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  return { apps, loading, reload: load };
}

export default function FounderDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { apps: myApplications, loading: appsLoading } = useMyApplications();

  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <div className="space-y-6">
          <WelcomeBanner name={user?.name || "Founder"} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Applications */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-foreground">My Applications</h2>
                    <p className="text-muted-foreground text-sm">Track your program applications</p>
                  </div>
                  <Button size="sm" className="gap-2 gradient-teal text-white border-0 hover:opacity-90" onClick={() => navigate("/founder/apply")}>
                    <Plus className="h-3.5 w-3.5" /> New Application
                  </Button>
                </div>

                {appsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
                        <div className="h-3 bg-secondary rounded w-1/3" />
                      </div>
                    ))}
                  </div>
                ) : myApplications.length > 0 ? (
                  <div className="space-y-3">
                    {myApplications.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        app={{
                          id: app.id,
                          program: app.programName ?? app.programId,
                          cohort: app.cohortName ? `${app.cohortName} ${app.cohortYear ?? ""}`.trim() : app.cohortId,
                          status: app.status,
                          submittedAt: app.submittedAt
                            ? new Date(app.submittedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                            : undefined,
                          feedback: app.reviewNotes ?? undefined,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border border-dashed rounded-2xl p-8 text-center">
                    <Rocket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">No applications yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">Browse active programs and submit your first application.</p>
                    <Button size="sm" className="gradient-teal text-white border-0" onClick={() => navigate("/founder/apply")}>
                      Browse Programs
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="font-display font-bold text-lg text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Apply to Program", icon: Rocket, path: "/founder/apply", color: "text-teal-600" },
                    { label: "Update Data Room", icon: Database, path: "/founder/data-room", color: "text-blue-600" },
                    { label: "Ask a Question", icon: MessageSquare, path: "/founder/qa", color: "text-purple-600" },
                    { label: "View Feedback", icon: Star, path: "/founder/applications", color: "text-yellow-600" },
                    { label: "Edit Profile", icon: Globe, path: "/founder/profile", color: "text-pink-600" },
                    { label: "Advisory Links", icon: ExternalLink, path: "/founder/advisory", color: "text-orange-600" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-secondary/30 transition-all card-hover text-center"
                      onClick={() => navigate(action.path)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                        <action.icon className={`h-4.5 w-4.5 ${action.color}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground leading-tight">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <DataRoomStatus />
              <TestimonialsSection />
              <AdvisoryLinks />
            </div>
          </div>
        </div>
      </FounderLayout>
    </ProtectedRoute>
  );
}
