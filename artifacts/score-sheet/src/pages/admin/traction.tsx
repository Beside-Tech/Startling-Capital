import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  User,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
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

interface TractionRow {
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
  founderName: string;
  founderEmail: string;
  companyName: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
}

interface PeriodSummary {
  periodMonth: number;
  periodYear: number;
  totalRevenue: string;
  avgUsers: string;
  totalHeadcount: string;
  avgBurnRate: string;
  founderCount: string;
  avgUserGrowth: number | null;
}

interface FounderStatus {
  founderId: number;
  founderName: string;
  founderEmail: string;
  companyName: string | null;
  lastSubmittedAt: string | null;
  entryCount: string;
}

interface SummaryResponse {
  periodSummary: PeriodSummary[];
  founderStatus: FounderStatus[];
}

interface ByCompanyRow {
  founderId: number;
  companyName: string | null;
  founderName: string;
  periodMonth: number;
  periodYear: number;
  revenue: string | null;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function periodLabel(month: number, year: number) {
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

function periodKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function fmtCurrency(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString();
}

const OVERDUE_DAYS = 45;

function daysAgo(dateStr: string | null) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// Pastel but distinct palette for stacked chart companies
const COMPANY_COLORS = [
  "#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#10b981", "#6366f1", "#f97316", "#06b6d4", "#84cc16",
  "#e11d48", "#0ea5e9", "#a855f7", "#22c55e", "#fb923c",
];

export default function AdminTraction() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <AdminTractionInner />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdminTractionInner() {
  const [expandedFounder, setExpandedFounder] = useState<number | null>(null);

  const { data: allRows = [], isLoading: rowsLoading } = useQuery<TractionRow[]>({
    queryKey: ["admin-traction"],
    queryFn: () => apiFetch("/api/admin/traction"),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryResponse>({
    queryKey: ["admin-traction-summary"],
    queryFn: () => apiFetch("/api/admin/traction/summary"),
  });

  const { data: byCompanyRaw = [] } = useQuery<ByCompanyRow[]>({
    queryKey: ["admin-traction-by-company"],
    queryFn: () => apiFetch("/api/admin/traction/by-company"),
  });

  const isLoading = rowsLoading || summaryLoading;

  // Most recent period
  const latestPeriod = summary?.periodSummary[summary.periodSummary.length - 1];

  // Build stacked area chart data: one row per period, one key per company
  const stackedChartData = (() => {
    if (!byCompanyRaw.length) return [];

    // Collect unique companies
    const companiesSet = new Set<string>();
    byCompanyRaw.forEach((r) => {
      const key = r.companyName || r.founderName;
      companiesSet.add(key);
    });
    const companies = Array.from(companiesSet);

    // Collect unique periods in order
    const periodsSet = new Set<string>();
    byCompanyRaw.forEach((r) => periodsSet.add(periodKey(r.periodMonth, r.periodYear)));
    const periods = Array.from(periodsSet).sort();

    // Build chart rows
    return periods.map((pk) => {
      const [y, m] = pk.split("-").map(Number);
      const row: Record<string, string | number> = {
        period: periodLabel(m, y),
      };
      companies.forEach((c) => {
        const entry = byCompanyRaw.find(
          (r) =>
            periodKey(r.periodMonth, r.periodYear) === pk &&
            (r.companyName || r.founderName) === c
        );
        row[c] = entry?.revenue ? parseFloat(entry.revenue) : 0;
      });
      return row;
    });
  })();

  const stackedCompanies = (() => {
    const set = new Set<string>();
    byCompanyRaw.forEach((r) => set.add(r.companyName || r.founderName));
    return Array.from(set);
  })();

  // Avg user growth from latest period
  const latestUserGrowth = latestPeriod?.avgUserGrowth;
  const userGrowthDisplay = latestUserGrowth !== null && latestUserGrowth !== undefined
    ? `${latestUserGrowth >= 0 ? "+" : ""}${Math.round(latestUserGrowth).toLocaleString()}`
    : "—";

  // Group rows by founder for expandable detail
  const byFounder = allRows.reduce<Record<number, TractionRow[]>>((acc, row) => {
    if (!acc[row.founderId]) acc[row.founderId] = [];
    acc[row.founderId].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Traction Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time portfolio growth metrics from founder monthly check-ins.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Portfolio Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {latestPeriod ? fmtCurrency(latestPeriod.totalRevenue) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {latestPeriod ? periodLabel(latestPeriod.periodMonth, latestPeriod.periodYear) : "No data"}
                </p>
              </div>
              <div className="bg-green-100 rounded-lg p-2">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Avg User Growth</p>
                <p className={`text-2xl font-bold mt-1 ${
                  latestUserGrowth === null || latestUserGrowth === undefined
                    ? "text-foreground"
                    : latestUserGrowth >= 0
                    ? "text-green-700"
                    : "text-red-600"
                }`}>
                  {userGrowthDisplay}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Period-over-period</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-2">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Founders</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {latestPeriod ? latestPeriod.founderCount : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Checked in this period</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-2">
                <User className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Overdue (45+ days)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {summary
                    ? summary.founderStatus.filter((f) => daysAgo(f.lastSubmittedAt) >= OVERDUE_DAYS).length
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">No check-in / &gt;45 days</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Revenue — Stacked Area Chart by Company */}
      {stackedChartData.length > 0 && stackedCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Portfolio Revenue by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stackedChartData}>
                <defs>
                  {stackedCompanies.map((company, i) => (
                    <linearGradient key={company} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COMPANY_COLORS[i % COMPANY_COLORS.length]} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COMPANY_COLORS[i % COMPANY_COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCurrency(v)} width={70} />
                <Tooltip formatter={(v, name) => [fmtCurrency(Number(v)), name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {stackedCompanies.map((company, i) => (
                  <Area
                    key={company}
                    type="monotone"
                    dataKey={company}
                    stackId="1"
                    stroke={COMPANY_COLORS[i % COMPANY_COLORS.length]}
                    fill={`url(#grad-${i})`}
                    strokeWidth={1.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-founder Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Founder Check-in Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (summary?.founderStatus ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No founders registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(summary?.founderStatus ?? []).map((fs) => {
                const overdue = daysAgo(fs.lastSubmittedAt) >= OVERDUE_DAYS;
                const founderRows = byFounder[fs.founderId] ?? [];
                const isExpanded = expandedFounder === fs.founderId;

                const sparkData = [...founderRows]
                  .sort((a, b) => (a.periodYear * 12 + a.periodMonth) - (b.periodYear * 12 + b.periodMonth))
                  .map((r) => ({
                    period: periodLabel(r.periodMonth, r.periodYear),
                    Revenue: r.revenue ? parseFloat(r.revenue) : null,
                    Users: r.activeUsers,
                    Burn: r.burnRate ? parseFloat(r.burnRate) : null,
                  }));

                const latestRow = founderRows.sort((a, b) =>
                  (b.periodYear * 12 + b.periodMonth) - (a.periodYear * 12 + a.periodMonth)
                )[0];

                return (
                  <div
                    key={fs.founderId}
                    className={`rounded-md border transition-all ${overdue ? "border-amber-200 bg-amber-50/50" : "border-border"}`}
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedFounder(isExpanded ? null : fs.founderId)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{fs.founderName}</p>
                            {fs.companyName && (
                              <span className="text-xs text-muted-foreground">— {fs.companyName}</span>
                            )}
                            {overdue && (
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              {overdue ? (
                                <Clock className="h-3 w-3 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                              {fs.lastSubmittedAt
                                ? <>Last: {new Date(fs.lastSubmittedAt).toLocaleDateString()}
                                    {overdue && ` (${daysAgo(fs.lastSubmittedAt)}d ago)`}
                                  </>
                                : <span className="text-amber-600 font-medium">Never submitted</span>
                              }
                            </span>
                            <span>{fs.entryCount} check-in{Number(fs.entryCount) !== 1 ? "s" : ""}</span>
                            {latestRow && (
                              <>
                                {latestRow.revenue && (
                                  <span className="text-green-700 font-medium">
                                    {fmtCurrency(latestRow.revenue)} rev
                                  </span>
                                )}
                                {latestRow.activeUsers && (
                                  <span>{latestRow.activeUsers.toLocaleString()} users</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && founderRows.length > 0 && (
                      <div className="px-4 pb-4 border-t space-y-4 mt-0 pt-4">
                        {sparkData.some((d) => d.Revenue !== null) && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Revenue Trend</p>
                            <ResponsiveContainer width="100%" height={120}>
                              <LineChart data={sparkData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCurrency(v)} width={56} />
                                <Tooltip formatter={(v) => [fmtCurrency(Number(v)), "Revenue"]} />
                                <Line type="monotone" dataKey="Revenue" stroke="#0d9488" strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {sparkData.some((d) => d.Users !== null) && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Active Users Trend</p>
                            <ResponsiveContainer width="100%" height={100}>
                              <LineChart data={sparkData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} width={40} />
                                <Tooltip />
                                <Line type="monotone" dataKey="Users" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {sparkData.some((d) => d.Burn !== null) && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Burn Rate Trend</p>
                            <ResponsiveContainer width="100%" height={100}>
                              <LineChart data={sparkData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCurrency(v)} width={56} />
                                <Tooltip formatter={(v) => [fmtCurrency(Number(v)), "Burn Rate"]} />
                                <Line type="monotone" dataKey="Burn" stroke="#f97316" strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {latestRow?.notes && (
                          <div className="rounded-md bg-muted/40 border px-3 py-2">
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              Latest Highlights & Challenges ({periodLabel(latestRow.periodMonth, latestRow.periodYear)})
                            </p>
                            <p className="text-sm">{latestRow.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {isExpanded && founderRows.length === 0 && (
                      <div className="px-4 pb-4 border-t pt-3 text-sm text-muted-foreground">
                        No check-ins submitted yet.
                      </div>
                    )}
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
