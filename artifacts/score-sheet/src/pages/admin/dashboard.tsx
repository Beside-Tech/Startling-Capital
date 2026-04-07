import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useGetCommitteeAnalytics, useGetPrograms, useGetCohorts, useGetConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, Globe, Award, MapPin, BarChart3, Building2,
  CheckCircle2, Clock, Star, ArrowUpRight, Zap, Target, Heart,
} from "lucide-react";

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "text-primary",
  bgColor = "bg-primary/10",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean };
  color?: string;
  bgColor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1 font-display">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                <ArrowUpRight className={`h-3.5 w-3.5 ${!trend.positive ? "rotate-180" : ""}`} />
                {trend.value}
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Alumni Network & Global Reach ────────────────────────────────────────────

const ALUMNI_DATA = [
  { name: "Toronto, Canada", flag: "🇨🇦", count: 145, programs: ["Innovator Program", "WISE Women"], type: "HQ" },
  { name: "Scarborough, Canada", flag: "🇨🇦", count: 38, programs: ["Innovator Program"], type: "Local" },
  { name: "Mississauga, Canada", flag: "🇨🇦", count: 24, programs: ["Innovator Program", "WISE Women"], type: "Local" },
  { name: "New York, USA", flag: "🇺🇸", count: 31, programs: ["CEI Global"], type: "International" },
  { name: "Washington DC, USA", flag: "🇺🇸", count: 18, programs: ["CEI Global"], type: "International" },
  { name: "London, UK", flag: "🇬🇧", count: 22, programs: ["CEI Global"], type: "International" },
  { name: "Lagos, Nigeria", flag: "🇳🇬", count: 29, programs: ["CEI Global"], type: "Africa" },
  { name: "Accra, Ghana", flag: "🇬🇭", count: 17, programs: ["CEI Global"], type: "Africa" },
  { name: "Nairobi, Kenya", flag: "🇰🇪", count: 14, programs: ["CEI Global"], type: "Africa" },
  { name: "Johannesburg, SA", flag: "🇿🇦", count: 11, programs: ["CEI Global"], type: "Africa" },
];

const REGION_COLORS: Record<string, string> = {
  HQ: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  Local: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  International: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  Africa: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

function AlumniNetworkSection() {
  const [filterType, setFilterType] = useState<string>("All");
  const types = ["All", "HQ", "Local", "International", "Africa"];
  const totalAlumni = ALUMNI_DATA.reduce((sum, d) => sum + d.count, 0);
  const filtered = filterType === "All" ? ALUMNI_DATA : ALUMNI_DATA.filter(d => d.type === filterType);
  const maxCount = Math.max(...filtered.map(d => d.count));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Alumni Network — {totalAlumni} graduates globally
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Nobellum alumni located across Canada, USA, UK, and Africa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats by Region */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { type: "HQ", label: "Toronto HQ", count: ALUMNI_DATA.filter(d => d.type === "HQ" || d.type === "Local").reduce((s, d) => s + d.count, 0), icon: "🇨🇦" },
          { type: "International", label: "United States", count: ALUMNI_DATA.filter(d => d.name.includes("USA")).reduce((s, d) => s + d.count, 0), icon: "🇺🇸" },
          { type: "International", label: "United Kingdom", count: ALUMNI_DATA.filter(d => d.name.includes("UK")).reduce((s, d) => s + d.count, 0), icon: "🇬🇧" },
          { type: "Africa", label: "Africa Diaspora", count: ALUMNI_DATA.filter(d => d.type === "Africa").reduce((s, d) => s + d.count, 0), icon: "🌍" },
        ].map(region => (
          <div key={region.label} className="bg-secondary/40 border border-border rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{region.icon}</div>
            <div className="font-bold text-xl text-foreground font-display">{region.count}</div>
            <div className="text-xs text-muted-foreground">{region.label}</div>
          </div>
        ))}
      </div>

      {/* Location Breakdown */}
      <div className="space-y-2">
        {filtered.sort((a, b) => b.count - a.count).map(loc => (
          <div key={loc.name} className="flex items-center gap-3">
            <span className="text-lg w-7 text-center">{loc.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">{loc.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge className={`text-[10px] border ${REGION_COLORS[loc.type]}`}>{loc.type}</Badge>
                  <span className="text-sm font-bold text-foreground">{loc.count}</span>
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                  style={{ width: `${(loc.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Program Department Users ─────────────────────────────────────────────────

const DEPT_USERS = [
  { name: "Program Director", role: "Program Manager", program: "All Programs", status: "Active", email: "director@nobellum.com" },
  { name: "WISE Program Lead", role: "Program Manager", program: "WISE Women", status: "Active", email: "wise@nobellum.com" },
  { name: "CEI Global Coordinator", role: "Program Manager", program: "CEI Global", status: "Active", email: "global@nobellum.com" },
  { name: "Application Reviewer 1", role: "Reviewer", program: "Innovator Program", status: "Active", email: "reviewer1@nobellum.com" },
  { name: "Application Reviewer 2", role: "Reviewer", program: "WISE Women", status: "Active", email: "reviewer2@nobellum.com" },
  { name: "Selection Committee", role: "Committee Member", program: "All Programs", status: "Active", email: "committee@nobellum.com" },
];

const ROLE_COLORS: Record<string, string> = {
  "Program Manager": "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  "Reviewer": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "Committee Member": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

function ProgramDeptUsersSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Program Department Team
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Staff roles: Program Managers, Reviewers, and Committee Members</p>
        </div>
        <Badge variant="outline" className="text-xs">{DEPT_USERS.length} members</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEPT_USERS.map(user => (
          <div key={user.email} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm text-foreground truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className={`text-[10px] border ${ROLE_COLORS[user.role] ?? ""}`}>{user.role}</Badge>
              <span className="text-[10px] text-muted-foreground">{user.program}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scoring Analytics (existing) ────────────────────────────────────────────

function ScoringAnalyticsSection() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedRoundName, setSelectedRoundName] = useState<string>("");

  const { data: programs } = useGetPrograms();
  const { data: cohorts } = useGetCohorts(
    { programId: selectedProgramId },
    { query: { enabled: !!selectedProgramId } as any }
  );
  const { data: config } = useGetConfig(
    { programId: selectedProgramId, cohortId: selectedCohortId },
    { query: { enabled: !!selectedProgramId && !!selectedCohortId } as any }
  );
  const { data: analytics } = useGetCommitteeAnalytics(
    { programId: selectedProgramId, cohortId: selectedCohortId, round: selectedRoundName },
    { query: { enabled: !!selectedProgramId && !!selectedCohortId && !!selectedRoundName } as any }
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={selectedProgramId} onValueChange={(val) => { setSelectedProgramId(val); setSelectedCohortId(""); setSelectedRoundName(""); }}>
                <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
                <SelectContent>
                  {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select value={selectedCohortId} onValueChange={(val) => { setSelectedCohortId(val); setSelectedRoundName(""); }} disabled={!selectedProgramId}>
                <SelectTrigger><SelectValue placeholder="Select Cohort" /></SelectTrigger>
                <SelectContent>
                  {cohorts?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Round</Label>
              <Select value={selectedRoundName} onValueChange={setSelectedRoundName} disabled={!selectedCohortId}>
                <SelectTrigger><SelectValue placeholder="Select Round" /></SelectTrigger>
                <SelectContent>
                  {config?.rounds.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {analytics && (
        <Tabs defaultValue="rankings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="rankings">Startup Rankings</TabsTrigger>
            <TabsTrigger value="matrix">Score Matrix</TabsTrigger>
            <TabsTrigger value="judges">Judge Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings">
            <Card>
              <CardHeader>
                <CardTitle>Startup Rankings</CardTitle>
                <CardDescription>Overall performance across all judges</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Startup</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Standard Dev</TableHead>
                      <TableHead className="text-right">Judges</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.rankings.map((ranking, i) => (
                      <TableRow key={ranking.startupId}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>{ranking.startupName}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{ranking.avgPct.toFixed(1)}%</TableCell>
                        <TableCell className="text-right text-muted-foreground">{ranking.sdPct.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{ranking.judgeCount}</TableCell>
                      </TableRow>
                    ))}
                    {analytics.rankings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No scores submitted yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix">
            <Card>
              <CardHeader>
                <CardTitle>Startup × Judge Matrix</CardTitle>
                <CardDescription>Detailed breakdown of scores per judge</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 w-48">Startup</TableHead>
                      {analytics.judges.map(j => (
                        <TableHead key={j.id} className="text-center w-24 text-xs truncate max-w-[100px]" title={j.name}>
                          {j.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.matrix.map(row => (
                      <TableRow key={row.startupId}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium truncate max-w-[180px]" title={row.startupName}>
                          {row.startupName}
                        </TableCell>
                        {analytics.judges.map(j => {
                          const score = row.judgeScores[j.id.toString()];
                          return (
                            <TableCell key={j.id} className="text-center">
                              {score ? (
                                <Badge variant={score > 80 ? "default" : score > 60 ? "secondary" : "outline"} className="font-mono">
                                  {score.toFixed(0)}%
                                </Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="judges">
            <Card>
              <CardHeader>
                <CardTitle>Judge Analytics</CardTitle>
                <CardDescription>Identify scoring biases and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judge</TableHead>
                      <TableHead className="text-right">Mean Score</TableHead>
                      <TableHead className="text-right">Bias</TableHead>
                      <TableHead className="text-right">Std Dev</TableHead>
                      <TableHead className="text-right">Scored</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.judgeAnalytics.map(ja => (
                      <TableRow key={ja.judgeId}>
                        <TableCell className="font-medium">{ja.judgeName}</TableCell>
                        <TableCell className="text-right">{ja.meanPct.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <span className={ja.bias > 5 ? "text-primary font-medium" : ja.bias < -5 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {ja.bias > 0 ? "+" : ""}{ja.bias.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{ja.sdPct.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{ja.startupsScored}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!analytics && selectedRoundName && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No scoring data available for this selection.</p>
          </CardContent>
        </Card>
      )}

      {!selectedProgramId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a Program, Cohort, and Round</p>
            <p className="text-sm mt-1">to view live scoring analytics and rankings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Nobellum Programs</h1>
              <p className="text-muted-foreground mt-1">Admin overview — applications, alumni network, and program health.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-xl px-4 py-2 text-sm font-medium">
              <Heart className="h-4 w-4" />
              Female-led · Canadian HQ · Global Reach
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Applications"
              value="247"
              subtitle="Across all active programs"
              icon={FileText}
              trend={{ value: "12% vs last cohort", positive: true }}
              color="text-blue-600 dark:text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <KpiCard
              title="Acceptance Rate"
              value="18%"
              subtitle="Competitive & selective"
              icon={CheckCircle2}
              trend={{ value: "Consistent with targets", positive: true }}
              color="text-teal-600 dark:text-teal-400"
              bgColor="bg-teal-500/10"
            />
            <KpiCard
              title="Active Founders"
              value="44"
              subtitle="Currently in programs"
              icon={Users}
              trend={{ value: "3 new this week", positive: true }}
              color="text-purple-600 dark:text-purple-400"
              bgColor="bg-purple-500/10"
            />
            <KpiCard
              title="Alumni Network"
              value="349"
              subtitle="Graduates across 10+ cities"
              icon={Globe}
              trend={{ value: "Global & growing", positive: true }}
              color="text-orange-600 dark:text-orange-400"
              bgColor="bg-orange-500/10"
            />
          </div>

          {/* Global Impact Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, label: "Combined Revenue", value: "$20M+", sub: "Generated by alumni startups", color: "text-teal-600 dark:text-teal-400" },
              { icon: Award, label: "VC Network", value: "$550M+", sub: "Combined fund access", color: "text-purple-600 dark:text-purple-400" },
              { icon: Building2, label: "STEM Businesses", value: "100+", sub: "Black-owned, launched by Nobellum", color: "text-blue-600 dark:text-blue-400" },
              { icon: Globe, label: "Countries Reached", value: "6+", sub: "Canada, USA, UK, Nigeria, Ghana, Kenya", color: "text-orange-600 dark:text-orange-400" },
            ].map(item => (
              <Card key={item.label} className="bg-gradient-to-br from-card to-secondary/20">
                <CardContent className="pt-5 pb-4">
                  <item.icon className={`h-5 w-5 ${item.color} mb-3`} />
                  <div className="font-display font-bold text-2xl text-foreground">{item.value}</div>
                  <div className="text-xs font-semibold text-foreground mt-0.5">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{item.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Application Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Application Pipeline
              </CardTitle>
              <CardDescription>Current application status across all programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Submitted", count: 247, color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20" },
                  { label: "Under Review", count: 89, color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/20" },
                  { label: "Shortlisted", count: 41, color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20" },
                  { label: "Accepted", count: 44, color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20" },
                  { label: "Rejected", count: 112, color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20" },
                  { label: "Withdrawn", count: 9, color: "bg-secondary text-muted-foreground border-border" },
                ].map(stage => (
                  <div key={stage.label} className={`border rounded-xl p-4 text-center ${stage.color}`}>
                    <div className="text-2xl font-bold font-display">{stage.count}</div>
                    <div className="text-xs font-medium mt-1">{stage.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Program Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Program Health
              </CardTitle>
              <CardDescription>Status of all three Nobellum programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    name: "Innovator Program",
                    phase: "Applications Open",
                    apps: 142,
                    accepted: 20,
                    capacity: 25,
                    location: "Toronto, Canada",
                    format: "Hybrid",
                    color: "from-teal-500 to-cyan-500",
                  },
                  {
                    name: "WISE Women",
                    phase: "Applications Open",
                    apps: 68,
                    accepted: 14,
                    capacity: 15,
                    location: "Toronto + Virtual",
                    format: "Hybrid",
                    color: "from-purple-500 to-pink-500",
                  },
                  {
                    name: "CEI Global",
                    phase: "Review Stage",
                    apps: 37,
                    accepted: 10,
                    capacity: 10,
                    location: "Global",
                    format: "Virtual",
                    color: "from-blue-500 to-indigo-500",
                  },
                ].map(program => (
                  <div key={program.name} className="border border-border rounded-xl overflow-hidden">
                    <div className={`h-1.5 bg-gradient-to-r ${program.color}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-foreground text-sm">{program.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {program.location}
                          </div>
                        </div>
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{program.phase}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Applications</span>
                          <span className="font-semibold text-foreground">{program.apps}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Accepted</span>
                          <span className="font-semibold text-foreground">{program.accepted} / {program.capacity}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${program.color} rounded-full`}
                            style={{ width: `${(program.accepted / program.capacity) * 100}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {program.format}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alumni Network */}
          <Card>
            <CardContent className="pt-6">
              <AlumniNetworkSection />
            </CardContent>
          </Card>

          {/* Program Department Team */}
          <Card>
            <CardContent className="pt-6">
              <ProgramDeptUsersSection />
            </CardContent>
          </Card>

          {/* Scoring Analytics */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold font-display text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Scoring Analytics
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Live scoring progress, startup rankings, and judge performance.</p>
            </div>
            <ScoringAnalyticsSection />
          </div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

// Local icon component used in this file
function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
