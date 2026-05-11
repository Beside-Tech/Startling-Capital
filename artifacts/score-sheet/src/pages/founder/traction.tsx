import { useState } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  DollarSign,
  Flame,
  User,
  CheckCircle2,
  Send,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("auth_token") ?? "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

interface TractionEntry {
  id: number;
  founderId: number;
  programId: string | null;
  periodMonth: number;
  periodYear: number;
  revenue: string | null;
  activeUsers: number | null;
  burnRate: string | null;
  headcount: number | null;
  notes: string | null;
  submittedAt: string;
  updatedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

function fmtCurrency(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function FounderTraction() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <FounderTractionInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function FounderTractionInner() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const now = new Date();
  const [formMonth, setFormMonth] = useState(now.getMonth() + 1);
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formRevenue, setFormRevenue] = useState("");
  const [formUsers, setFormUsers] = useState("");
  const [formBurnRate, setFormBurnRate] = useState("");
  const [formHeadcount, setFormHeadcount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: history = [], isLoading } = useQuery<TractionEntry[]>({
    queryKey: ["founder-traction"],
    queryFn: () => apiFetch("/api/founder/traction"),
  });

  const { data: latest } = useQuery<TractionEntry | null>({
    queryKey: ["founder-traction-latest"],
    queryFn: () => apiFetch("/api/founder/traction/latest"),
  });

  const submitCheckin = useMutation({
    mutationFn: () =>
      apiFetch("/api/founder/traction", {
        method: "POST",
        body: JSON.stringify({
          periodMonth: formMonth,
          periodYear: formYear,
          revenue: formRevenue || undefined,
          activeUsers: formUsers ? parseInt(formUsers) : undefined,
          burnRate: formBurnRate || undefined,
          headcount: formHeadcount ? parseInt(formHeadcount) : undefined,
          notes: formNotes || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["founder-traction"] });
      qc.invalidateQueries({ queryKey: ["founder-traction-latest"] });
      toast({ title: "Traction check-in submitted!" });
    },
    onError: (e: Error) =>
      toast({ title: e.message ?? "Failed to submit check-in", variant: "destructive" }),
  });

  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - 2 + i
  );

  const alreadySubmittedThisPeriod = history.some(
    (h) => h.periodMonth === formMonth && h.periodYear === formYear
  );

  const chartData = history.map((h) => ({
    period: `${MONTHS[h.periodMonth - 1].slice(0, 3)} ${h.periodYear}`,
    Revenue: h.revenue ? parseFloat(h.revenue) : null,
    "Active Users": h.activeUsers,
    "Burn Rate": h.burnRate ? parseFloat(h.burnRate) : null,
    Headcount: h.headcount,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Traction Check-in
        </h1>
        <p className="text-muted-foreground mt-1">
          Submit your monthly business metrics to keep Startling Capital up to date on your growth.
        </p>
      </div>

      {latest && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            Last check-in: <span className="font-semibold">{periodLabel(latest.periodMonth, latest.periodYear)}</span>
            {" "}— submitted {new Date(latest.submittedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Check-in Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-primary" />
            Monthly Check-in
            {alreadySubmittedThisPeriod && (
              <Badge variant="secondary" className="ml-2">Updating existing entry</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Period selector */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Month *</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={formMonth}
                  onChange={(e) => setFormMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Year *</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={formYear}
                  onChange={(e) => setFormYear(parseInt(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                  Monthly Revenue (USD)
                </label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 15000"
                  value={formRevenue}
                  onChange={(e) => setFormRevenue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Total revenue this month</p>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Active Users / Customers
                </label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  placeholder="e.g. 250"
                  value={formUsers}
                  onChange={(e) => setFormUsers(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">MAU or active paying customers</p>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Monthly Burn Rate (USD)
                </label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 8000"
                  value={formBurnRate}
                  onChange={(e) => setFormBurnRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Net cash spent this month</p>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-600" />
                  Headcount
                </label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  placeholder="e.g. 4"
                  value={formHeadcount}
                  onChange={(e) => setFormHeadcount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Total full-time employees</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Highlights & Challenges</label>
              <Textarea
                className="mt-1"
                placeholder="What went well? What challenges are you facing? Any milestones this month?"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={() => submitCheckin.mutate()}
              disabled={submitCheckin.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitCheckin.isPending
                ? "Submitting..."
                : alreadySubmittedThisPeriod
                ? "Update Check-in"
                : "Submit Check-in"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Traction Timeline */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              My Traction Timeline
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({history.length} check-in{history.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Revenue chart */}
            {history.some((h) => h.revenue !== null) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Revenue (USD)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCurrency(String(v))} width={64} />
                    <Tooltip formatter={(v) => [fmtCurrency(String(v)), "Revenue"]} />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Users chart */}
            {history.some((h) => h.activeUsers !== null) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Users / Customers</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="Active Users"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Historical table */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">History</p>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Period</th>
                      <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Revenue</th>
                      <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Users</th>
                      <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Burn Rate</th>
                      <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Headcount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((h) => (
                      <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-medium">{periodLabel(h.periodMonth, h.periodYear)}</td>
                        <td className="px-3 py-2 text-right text-green-700 font-medium">{fmtCurrency(h.revenue)}</td>
                        <td className="px-3 py-2 text-right">{h.activeUsers ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{fmtCurrency(h.burnRate)}</td>
                        <td className="px-3 py-2 text-right">{h.headcount ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && history.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No check-ins yet</p>
            <p className="text-sm mt-1">Submit your first monthly traction check-in above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

