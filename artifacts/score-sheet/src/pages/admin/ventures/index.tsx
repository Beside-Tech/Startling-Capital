import { useState } from "react";
import { useLocation } from "wouter";
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
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Search,
  Building2,
  ChevronRight,
  Percent,
  Calendar,
  Briefcase,
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

interface PortfolioSummary {
  totalInvested: string;
  portfolioCount: string;
  avgEquityPct: string;
  activeCount: string;
  exitedCount: string;
}

interface Investment {
  id: number;
  founderId: number;
  startupName: string;
  investmentDate: string;
  amountCad: string | null;
  equityPct: string | null;
  instrument: string;
  roundName: string | null;
  status: string;
  notes: string | null;
  founderName: string;
  founderEmail: string;
  companyName: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
  avatarUrl: string | null;
}

interface Founder {
  id: number;
  name: string;
  email: string;
  companyName: string | null;
}

function fmtCad(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `CA$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `CA$${(n / 1_000).toFixed(1)}K`;
  return `CA$${n.toLocaleString()}`;
}

function fmtPct(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50",
  exited: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50",
  written_off: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50",
};

const INSTRUMENT_OPTIONS = ["SAFE", "Equity", "Convertible Note", "Revenue Share", "Grant"];
const STATUS_OPTIONS = ["active", "exited", "written_off"];

export default function AdminVenturesIndex() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <AdminVenturesInner />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdminVenturesInner() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["ventures-summary"],
    queryFn: () => apiFetch("/api/admin/ventures/portfolio-summary"),
  });

  const { data: investments = [], isLoading } = useQuery<Investment[]>({
    queryKey: ["ventures-investments"],
    queryFn: () => apiFetch("/api/admin/ventures/investments"),
  });

  const { data: founders = [] } = useQuery<Founder[]>({
    queryKey: ["admin-founders-list"],
    queryFn: () => apiFetch("/api/admin/founders"),
  });

  const filtered = investments.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [inv.startupName, inv.founderName, inv.companyName, inv.sector, inv.country].some(
        (v) => v?.toLowerCase().includes(q)
      );
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Startling Capital Ventures
          </h1>
          <p className="text-muted-foreground mt-1">
            Investment portfolio — track equity stakes, instruments, and founder performance.
          </p>
        </div>
        <Button
          className="gap-2 gradient-teal text-white border-0 hover:opacity-90"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-4 w-4" />
          Add Investment
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Deployed</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {summary ? fmtCad(summary.totalInvested) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Capital committed</p>
              </div>
              <div className="bg-green-100 rounded-lg p-2 dark:bg-green-900/40">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Portfolio Co's</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {summary?.portfolioCount ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary ? `${summary.activeCount} active, ${summary.exitedCount} exited` : ""}
                </p>
              </div>
              <div className="bg-blue-100 rounded-lg p-2 dark:bg-blue-900/40">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Avg Equity Stake</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {summary ? fmtPct(summary.avgEquityPct) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Across all investments</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-2 dark:bg-purple-900/40">
                <Percent className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Founders</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {summary?.portfolioCount ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">In portfolio</p>
              </div>
              <div className="bg-teal-100 rounded-lg p-2 dark:bg-teal-900/40">
                <Users className="h-4 w-4 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search investments, founders, companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="written_off">Written Off</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} investment{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Portfolio Cards Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading portfolio...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No investments yet</p>
            <p className="text-sm mt-1">Add the first investment to start tracking your portfolio.</p>
            <Button className="mt-4 gap-2 gradient-teal text-white border-0" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /> Add Investment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inv) => (
            <Card
              key={inv.id}
              className="hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/admin/ventures/${inv.id}`)}
            >
              <CardContent className="pt-5">
                <div className="flex items-start gap-3 mb-4">
                  {inv.avatarUrl ? (
                    <img src={inv.avatarUrl} alt={inv.founderName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(inv.founderName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{inv.startupName}</h3>
                    <p className="text-xs text-muted-foreground">{inv.founderName}</p>
                    {inv.companyName && inv.companyName !== inv.startupName && (
                      <p className="text-xs text-primary">{inv.companyName}</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[inv.status] ?? STATUS_COLORS.active}`}>
                    {inv.status === "written_off" ? "Written Off" : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Amount</p>
                    <p className="text-sm font-bold text-foreground">{fmtCad(inv.amountCad)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Equity</p>
                    <p className="text-sm font-bold text-foreground">{fmtPct(inv.equityPct)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Instrument</p>
                    <p className="text-xs font-medium text-foreground">{inv.instrument}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Round</p>
                    <p className="text-xs font-medium text-foreground">{inv.roundName ?? "—"}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">Stage</p>
                    <p className="text-xs font-medium text-foreground">{inv.stage ?? "—"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(inv.investmentDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    View details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <AddInvestmentModal
          founders={founders}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["ventures-investments"] });
            qc.invalidateQueries({ queryKey: ["ventures-summary"] });
            setShowAddModal(false);
            toast({ title: "Investment added to portfolio!" });
          }}
        />
      )}
    </div>
  );
}

function AddInvestmentModal({
  founders,
  onClose,
  onCreated,
}: {
  founders: Founder[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [founderId, setFounderId] = useState("");
  const [startupName, setStartupName] = useState("");
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amountCad, setAmountCad] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [equityPct, setEquityPct] = useState("");
  const [instrument, setInstrument] = useState("SAFE");
  const [roundName, setRoundName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  const handleFounderChange = (id: string) => {
    setFounderId(id);
    const f = founders.find((f) => String(f.id) === id);
    if (f && f.companyName && !startupName) {
      setStartupName(f.companyName);
    }
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/ventures/investments", {
        method: "POST",
        body: JSON.stringify({
          founderId: parseInt(founderId),
          startupName,
          investmentDate,
          amountCad: amountCad || undefined,
          amountUsd: amountUsd || undefined,
          isLead,
          equityPct: equityPct || undefined,
          instrument,
          roundName: roundName || undefined,
          notes: notes || undefined,
          status,
        }),
      }),
    onSuccess: onCreated,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Investment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Founder *</label>
            <Select value={founderId} onValueChange={handleFounderChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a founder..." />
              </SelectTrigger>
              <SelectContent>
                {founders.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name} — {f.companyName ?? f.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Startup / Company Name *</label>
            <Input
              className="mt-1"
              placeholder="e.g. PayBridge Technologies"
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Investment Date *</label>
              <Input
                className="mt-1"
                type="date"
                value={investmentDate}
                onChange={(e) => setInvestmentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                className="mt-1"
                type="number"
                min={0}
                placeholder="e.g. 50000"
                value={amountCad}
                onChange={(e) => setAmountCad(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (USD)</label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                placeholder="e.g. 40000"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Equity %</label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={100}
                step="0.001"
                placeholder="e.g. 5.000"
                value={equityPct}
                onChange={(e) => setEquityPct(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-2">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Instrument</label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUMENT_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Round Name</label>
              <Input
                className="mt-1"
                placeholder="e.g. Pre-seed"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              className="mt-1"
              placeholder="Internal notes about this investment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="gradient-teal text-white border-0 hover:opacity-90"
            onClick={() => create.mutate()}
            disabled={create.isPending || !founderId || !startupName || !investmentDate}
          >
            {create.isPending ? "Adding..." : "Add Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

