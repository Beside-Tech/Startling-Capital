import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Download, Star, RefreshCw, Search, Eye, EyeOff,
  Trash2, ArrowUp, ArrowDown, MessageSquare,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Testimonial = {
  id: number;
  content: string;
  programName: string | null;
  cohortYear: string | null;
  isActive: boolean;
  displayOrder: number;
  submittedAt: string;
  approvedAt: string | null;
  founderId: number;
  founderName: string;
  founderEmail: string;
  founderAvatar: string | null;
  founderCompany: string | null;
  founderCity: string | null;
  founderCountry: string | null;
  founderSector: string | null;
};

async function fetchTestimonials(token: string): Promise<Testimonial[]> {
  const res = await fetch(`${BASE}/api/admin/testimonials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load testimonials");
  return res.json();
}

async function updateTestimonial(id: number, data: Partial<{ isActive: boolean; displayOrder: number }>, token: string) {
  const res = await fetch(`${BASE}/api/admin/testimonials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
}

async function deleteTestimonial(id: number, token: string) {
  const res = await fetch(`${BASE}/api/admin/testimonials/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function downloadTestimonialsJson(testimonials: Testimonial[]) {
  const data = testimonials.map(t => ({
    id: t.id,
    testimonial: t.content,
    program: t.programName,
    cohortYear: t.cohortYear,
    status: t.isActive ? "Published" : "Pending",
    displayOrder: t.displayOrder,
    submittedAt: t.submittedAt,
    founder: {
      id: t.founderId,
      name: t.founderName,
      email: t.founderEmail,
      company: t.founderCompany,
      city: t.founderCity,
      country: t.founderCountry,
      sector: t.founderSector,
      avatar: t.founderAvatar,
    },
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Startling Capital-testimonials-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTestimonialsCsv(testimonials: Testimonial[]) {
  const headers = ["ID", "Founder Name", "Email", "Company", "City", "Country", "Sector", "Program", "Cohort Year", "Testimonial", "Status", "Display Order", "Submitted At"];
  const rows = testimonials.map(t => [
    t.id,
    `"${t.founderName.replace(/"/g, '""')}"`,
    t.founderEmail,
    `"${(t.founderCompany ?? "").replace(/"/g, '""')}"`,
    t.founderCity ?? "",
    t.founderCountry ?? "",
    t.founderSector ?? "",
    t.programName ?? "",
    t.cohortYear ?? "",
    `"${t.content.replace(/"/g, '""').replace(/\n/g, " ")}"`,
    t.isActive ? "Published" : "Pending",
    t.displayOrder,
    new Date(t.submittedAt).toLocaleDateString(),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Startling Capital-testimonials-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTestimonials() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending">("all");
  const [actioning, setActioning] = useState<number | null>(null);

  const token = localStorage.getItem("auth_token") ?? "";

  const load = () => {
    setLoading(true);
    fetchTestimonials(token).then(setTestimonials).catch(() => toast({ title: "Failed to load", variant: "destructive" })).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (t: Testimonial) => {
    setActioning(t.id);
    try {
      await updateTestimonial(t.id, { isActive: !t.isActive }, token);
      setTestimonials(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !t.isActive, approvedAt: !t.isActive ? new Date().toISOString() : x.approvedAt } : x));
      toast({ title: t.isActive ? "Hidden from homepage" : "Published to homepage" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setActioning(null);
    }
  };

  const move = async (t: Testimonial, dir: "up" | "down") => {
    const newOrder = dir === "up" ? Math.max(0, t.displayOrder - 1) : t.displayOrder + 1;
    setActioning(t.id);
    try {
      await updateTestimonial(t.id, { displayOrder: newOrder }, token);
      setTestimonials(prev => prev.map(x => x.id === t.id ? { ...x, displayOrder: newOrder } : x));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setActioning(null);
    }
  };

  const remove = async (t: Testimonial) => {
    if (!confirm(`Delete testimonial from ${t.founderName}?`)) return;
    setActioning(t.id);
    try {
      await deleteTestimonial(t.id, token);
      setTestimonials(prev => prev.filter(x => x.id !== t.id));
      toast({ title: "Testimonial deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setActioning(null);
    }
  };

  const filtered = testimonials.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || [t.founderName, t.content, t.founderCompany, t.programName].some(v => v?.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? t.isActive : !t.isActive);
    return matchSearch && matchStatus;
  });

  const active = testimonials.filter(t => t.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  const pending = testimonials.filter(t => !t.isActive);

  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Testimonials</h1>
              <p className="text-muted-foreground mt-1">
                Review founder testimonials, activate them for the homepage, and download with full founder details.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTestimonialsCsv(filtered)} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => downloadTestimonialsJson(filtered)} className="gap-1.5 gradient-teal text-white border-0 hover:opacity-90">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Submitted", value: testimonials.length, color: "text-blue-600 dark:text-blue-400" },
              { label: "Published (Active)", value: active.length, color: "text-teal-600 dark:text-teal-400" },
              { label: "Pending Review", value: pending.length, color: "text-orange-600 dark:text-orange-400" },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3">
                  <div className={`font-bold text-2xl font-display ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder="Search testimonials or founders..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {(["all", "active", "pending"] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium capitalize ${filterStatus === status ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"}`}
              >
                {status === "all" ? "All" : status === "active" ? "Published" : "Pending"}
              </button>
            ))}
          </div>

          {/* Published (ordered) */}
          {filterStatus !== "pending" && active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                Published on Homepage ({active.length}) — drag to reorder
              </h2>
              <div className="space-y-3">
                {active.map((t, idx) => (
                  <TestimonialCard key={t.id} testimonial={t} onToggle={toggle} onMove={move} onDelete={remove} actioning={actioning} isFirst={idx === 0} isLast={idx === active.length - 1} />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {filterStatus !== "active" && pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Pending Review ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(t => (
                  <TestimonialCard key={t.id} testimonial={t} onToggle={toggle} onMove={move} onDelete={remove} actioning={actioning} isFirst isLast />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No testimonials yet</p>
                <p className="text-sm mt-1">Founders can submit testimonials from their portal</p>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

function TestimonialCard({
  testimonial: t,
  onToggle,
  onMove,
  onDelete,
  actioning,
  isFirst,
  isLast,
}: {
  testimonial: Testimonial;
  onToggle: (t: Testimonial) => void;
  onMove: (t: Testimonial, dir: "up" | "down") => void;
  onDelete: (t: Testimonial) => void;
  actioning: number | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const busy = actioning === t.id;

  return (
    <Card className={`${t.isActive ? "border-teal-500/30 bg-teal-500/3" : "border-border"}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          {/* Order controls */}
          {t.isActive && (
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={() => onMove(t, "up")}
                disabled={isFirst || busy}
                className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground text-center w-7 font-bold">{t.displayOrder + 1}</span>
              <button
                onClick={() => onMove(t, "down")}
                disabled={isLast || busy}
                className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Founder info */}
            <div className="flex items-start gap-3 mb-3">
              {t.founderAvatar ? (
                <img src={t.founderAvatar} alt={t.founderName} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {initials(t.founderName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{t.founderName}</span>
                  {t.isActive ? (
                    <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 text-[10px]">Published</Badge>
                  ) : (
                    <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 text-[10px]">Pending</Badge>
                  )}
                  {t.programName && <Badge variant="outline" className="text-[10px]">{t.programName}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.founderCompany && <span>{t.founderCompany} · </span>}
                  {t.founderEmail}
                  {(t.founderCity || t.founderCountry) && <span> · {[t.founderCity, t.founderCountry].filter(Boolean).join(", ")}</span>}
                </div>
              </div>
            </div>

            {/* Testimonial text */}
            <blockquote className="text-sm text-foreground leading-relaxed border-l-2 border-primary/30 pl-3 mb-3">
              "{t.content}"
            </blockquote>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-muted-foreground">
                Submitted {new Date(t.submittedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                {t.approvedAt && ` · Published ${new Date(t.approvedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}`}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={t.isActive ? "outline" : "default"}
                  onClick={() => onToggle(t)}
                  disabled={busy}
                  className={`h-7 gap-1.5 text-xs ${!t.isActive ? "gradient-teal text-white border-0 hover:opacity-90" : ""}`}
                >
                  {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : t.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {t.isActive ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(t)}
                  disabled={busy}
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

