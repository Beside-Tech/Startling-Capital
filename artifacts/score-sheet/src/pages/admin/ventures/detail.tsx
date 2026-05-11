import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  DollarSign,
  Percent,
  Calendar,
  Building2,
  Globe,
  Linkedin,
  MapPin,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Briefcase,
  User,
  Star,
  Award,
  CheckCircle2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("auth_token") ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

interface Investment {
  id: number;
  founderId: number;
  startupName: string;
  investmentDate: string;
  amountCad: string | null;
  amountUsd: string | null;
  isLead: boolean;
  equityPct: string | null;
  instrument: string;
  roundName: string | null;
  status: string;
  notes: string | null;
  founderName: string;
  founderEmail: string;
  companyName: string | null;
  companyWebsite: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  investmentStatus: string;
}

interface InvestmentRound {
  id: number;
  investmentId: number;
  roundName: string;
  amount: string | null;
  currency: string;
  isLead: boolean;
  date: string;
  notes: string | null;
  createdAt: string;
}

interface TractionEntry {
  id: number;
  periodMonth: number;
  periodYear: number;
  revenue: string | null;
  activeUsers: number | null;
  burnRate: string | null;
  headcount: number | null;
  notes: string | null;
  submittedAt: string;
}

interface ScoringEntry {
  roundName: string;
  startupName: string;
  programId: string;
  cohortId: string;
  avgScore: string | null;
  totalScores: number;
  latestAt: string;
}

interface DetailResponse {
  investment: Investment;
  rounds: InvestmentRound[];
  traction: TractionEntry[];
  scoring: ScoringEntry[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtMoney(val: string | null | undefined, currency = "CA$") {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toLocaleString()}`;
}

function fmtPct(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function scoreColor(avg: string | null) {
  if (!avg) return "text-muted-foreground";
  const n = parseFloat(avg);
  if (n >= 8) return "text-green-600";
  if (n >= 6) return "text-amber-600";
  return "text-red-500";
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50",
  exited: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50",
  written_off: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50",
};

const INSTRUMENT_OPTIONS = ["SAFE", "Equity", "Convertible Note", "Revenue Share", "Grant"];
const STATUS_OPTIONS = ["active", "exited", "written_off"];
const CURRENCY_OPTIONS = ["CAD", "USD", "GBP", "EUR"];

export default function AdminVenturesDetail() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <AdminVenturesDetailInner />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdminVenturesDetailInner() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, error } = useQuery<DetailResponse>({
    queryKey: ["ventures-detail", id],
    queryFn: () => apiFetch(`/api/admin/ventures/investments/${id}`),
    enabled: !!id,
  });

  const deleteInvestment = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/ventures/investments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ventures-investments"] });
      qc.invalidateQueries({ queryKey: ["ventures-summary"] });
      toast({ title: "Investment removed from portfolio" });
      navigate("/admin/ventures");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted-foreground">Loading investment details...</div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Investment not found.</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate("/admin/ventures")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolio
        </Button>
      </div>
    );
  }

  const { investment, rounds, traction, scoring } = data;
  const initials = investment.founderName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/admin/ventures")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Startling Capital Ventures
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddRoundModal(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Round
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditModal(true)}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        {investment.avatarUrl ? (
          <img src={investment.avatarUrl} alt={investment.founderName} className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full gradient-teal flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display text-foreground">{investment.startupName}</h1>
            <Badge className={`${STATUS_COLORS[investment.status] ?? STATUS_COLORS.active}`}>
              {investment.status === "written_off" ? "Written Off" : investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
            </Badge>
            {investment.isLead && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 text-xs dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50">
                <Star className="h-2.5 w-2.5 mr-1" />
                Lead Investor
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5">{investment.founderName} · {investment.founderEmail}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {investment.sector && <Badge variant="outline" className="text-xs">{investment.sector}</Badge>}
            {investment.stage && <Badge variant="outline" className="text-xs">{investment.stage}</Badge>}
            {(investment.city || investment.country) && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[investment.city, investment.country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Investment details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Amount (CAD)", value: fmtMoney(investment.amountCad, "CA$"), icon: DollarSign, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" },
          { label: "Amount (USD)", value: fmtMoney(investment.amountUsd, "US$"), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Equity Stake", value: fmtPct(investment.equityPct), icon: Percent, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" },
          { label: "Instrument", value: investment.instrument, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-bold text-lg text-foreground mt-0.5">{item.value}</p>
                </div>
                <div className={`${item.bg} rounded-lg p-1.5`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Rounds Timeline + Scoring + Traction */}
        <div className="lg:col-span-2 space-y-6">
          {/* Investment Rounds Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Investment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No additional rounds recorded yet.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowAddRoundModal(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Round
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />
                  <div className="space-y-4">
                    <div className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white shrink-0 z-10 relative">
                        <DollarSign className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{investment.roundName ?? "Initial Investment"}</p>
                          <span className="text-xs text-muted-foreground">{new Date(investment.investmentDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {investment.amountCad && <p className="text-sm text-green-700 font-medium">{fmtMoney(investment.amountCad, "CA$")}</p>}
                          {investment.amountUsd && <p className="text-sm text-emerald-700 font-medium">{fmtMoney(investment.amountUsd, "US$")}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">{investment.instrument} · {fmtPct(investment.equityPct)} equity{investment.isLead ? " · Lead" : ""}</p>
                      </div>
                    </div>
                    {rounds.map((r) => (
                      <div key={r.id} className="flex gap-4 relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 z-10 relative">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-semibold text-sm flex items-center gap-2">
                              {r.roundName}
                              {r.isLead && <Star className="h-3 w-3 text-amber-500" />}
                            </p>
                            <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>
                          <p className="text-sm text-green-700 font-medium">{fmtMoney(r.amount, r.currency === "USD" ? "US$" : r.currency === "GBP" ? "£" : "CA$")}</p>
                          {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scoring History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Scoring History
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (program evaluation rounds)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scoring.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No scoring history found.</p>
                  <p className="text-xs mt-1 opacity-70">
                    Scores appear once judges evaluate this founder's startup during a program round.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scoring.map((s, i) => {
                    const avg = s.avgScore ? parseFloat(s.avgScore) : null;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors">
                        <div className="shrink-0">
                          <div className={`text-xl font-bold font-display ${scoreColor(s.avgScore)}`}>
                            {avg !== null ? avg.toFixed(1) : "—"}
                          </div>
                          <div className="text-[9px] text-muted-foreground text-center">/ 10</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.roundName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.startupName} · {s.programId}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            {s.totalScores} score{s.totalScores !== 1 ? "s" : ""}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(s.latestAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last 3 Traction Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Traction Check-ins
                <span className="text-xs font-normal text-muted-foreground ml-1">(last 3)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {traction.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No traction check-ins submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {traction.map((t) => (
                    <div key={t.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {MONTHS[t.periodMonth - 1]} {t.periodYear}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(t.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {t.revenue && (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Revenue</p>
                            <p className="text-xs font-semibold text-green-700">{fmtMoney(t.revenue, "CA$")}</p>
                          </div>
                        )}
                        {t.activeUsers !== null && (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Users</p>
                            <p className="text-xs font-semibold">{t.activeUsers.toLocaleString()}</p>
                          </div>
                        )}
                        {t.burnRate && (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Burn Rate</p>
                            <p className="text-xs font-semibold text-orange-600">{fmtMoney(t.burnRate, "CA$")}</p>
                          </div>
                        )}
                        {t.headcount !== null && (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Headcount</p>
                            <p className="text-xs font-semibold">{t.headcount}</p>
                          </div>
                        )}
                      </div>
                      {t.notes && (
                        <p className="text-xs text-muted-foreground bg-secondary/40 rounded px-2 py-1.5 leading-relaxed">
                          {t.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Founder Profile */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Founder Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {investment.avatarUrl ? (
                  <img src={investment.avatarUrl} alt={investment.founderName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {investment.founderName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{investment.founderName}</p>
                  <p className="text-xs text-muted-foreground">{investment.founderEmail}</p>
                </div>
              </div>

              {investment.bio && (
                <p className="text-xs text-muted-foreground leading-relaxed">{investment.bio}</p>
              )}

              <div className="space-y-1.5">
                {investment.companyName && (
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{investment.companyName}</span>
                  </div>
                )}
                {(investment.city || investment.country) && (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{[investment.city, investment.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {investment.companyWebsite && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={investment.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {investment.companyWebsite.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {investment.linkedinUrl && (
                  <div className="flex items-center gap-2 text-xs">
                    <Linkedin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={investment.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <p className="text-[10px] text-muted-foreground mb-1.5">Investment Date</p>
                <p className="text-xs font-medium">
                  {new Date(investment.investmentDate).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {investment.notes && (
                <div className="pt-2 border-t">
                  <p className="text-[10px] text-muted-foreground mb-1">Internal Notes</p>
                  <p className="text-xs text-foreground leading-relaxed">{investment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditInvestmentModal
          investment={investment}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ["ventures-detail", id] });
            qc.invalidateQueries({ queryKey: ["ventures-investments"] });
            qc.invalidateQueries({ queryKey: ["ventures-summary"] });
            setShowEditModal(false);
            toast({ title: "Investment updated" });
          }}
        />
      )}

      {showAddRoundModal && (
        <AddRoundModal
          investmentId={investment.id}
          onClose={() => setShowAddRoundModal(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ["ventures-detail", id] });
            setShowAddRoundModal(false);
            toast({ title: "Round added" });
          }}
        />
      )}

      {showDeleteConfirm && (
        <Dialog open onOpenChange={() => setShowDeleteConfirm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Investment?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently remove <strong>{investment.startupName}</strong> from the portfolio and cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteInvestment.mutate()}
                disabled={deleteInvestment.isPending}
              >
                {deleteInvestment.isPending ? "Deleting..." : "Delete Investment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditInvestmentModal({
  investment,
  onClose,
  onUpdated,
}: {
  investment: Investment;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [startupName, setStartupName] = useState(investment.startupName);
  const [investmentDate, setInvestmentDate] = useState(investment.investmentDate);
  const [amountCad, setAmountCad] = useState(investment.amountCad ?? "");
  const [amountUsd, setAmountUsd] = useState(investment.amountUsd ?? "");
  const [isLead, setIsLead] = useState(investment.isLead);
  const [equityPct, setEquityPct] = useState(investment.equityPct ?? "");
  const [instrument, setInstrument] = useState(investment.instrument);
  const [roundName, setRoundName] = useState(investment.roundName ?? "");
  const [notes, setNotes] = useState(investment.notes ?? "");
  const [status, setStatus] = useState(investment.status);

  const update = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/ventures/investments/${investment.id}`, {
        method: "PUT",
        body: JSON.stringify({
          startupName,
          investmentDate,
          amountCad: amountCad || undefined,
          amountUsd: amountUsd || undefined,
          isLead,
          equityPct: equityPct || undefined,
          instrument,
          roundName: roundName || undefined,
          notes,
          status,
        }),
      }),
    onSuccess: onUpdated,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Investment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Startup / Company Name</label>
            <Input className="mt-1" value={startupName} onChange={(e) => setStartupName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Investment Date</label>
              <Input className="mt-1" type="date" value={investmentDate} onChange={(e) => setInvestmentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "written_off" ? "Written Off" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount (CAD)</label>
              <Input className="mt-1" type="number" placeholder="e.g. 25000" value={amountCad} onChange={(e) => setAmountCad(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (USD)</label>
              <Input className="mt-1" type="number" placeholder="e.g. 20000" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Equity %</label>
              <Input className="mt-1" type="number" step="0.001" value={equityPct} onChange={(e) => setEquityPct(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Instrument</label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTRUMENT_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Round Name</label>
              <Input className="mt-1" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={isLead}
                  onChange={(e) => setIsLead(e.target.checked)}
                />
                <span className="text-sm font-medium">Lead Investor</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="gradient-teal text-white border-0 hover:opacity-90"
            onClick={() => update.mutate()}
            disabled={update.isPending}
          >
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRoundModal({
  investmentId,
  onClose,
  onAdded,
}: {
  investmentId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [roundName, setRoundName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [isLead, setIsLead] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const addRound = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/ventures/investments/${investmentId}/rounds`, {
        method: "POST",
        body: JSON.stringify({
          roundName,
          amount: amount || undefined,
          currency,
          isLead,
          date,
          notes: notes || undefined,
        }),
      }),
    onSuccess: onAdded,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Investment Round</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium">Round Name *</label>
            <Input className="mt-1" placeholder="e.g. Seed, Series A" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input className="mt-1" type="number" placeholder="e.g. 500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Date *</label>
            <Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLead"
              className="h-4 w-4 rounded accent-primary"
              checked={isLead}
              onChange={(e) => setIsLead(e.target.checked)}
            />
            <label htmlFor="isLead" className="text-sm font-medium cursor-pointer">
              Startling Capital is lead investor in this round
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="mt-1" rows={2} placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="gradient-teal text-white border-0 hover:opacity-90"
            onClick={() => addRound.mutate()}
            disabled={addRound.isPending || !roundName || !date}
          >
            {addRound.isPending ? "Adding..." : "Add Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

