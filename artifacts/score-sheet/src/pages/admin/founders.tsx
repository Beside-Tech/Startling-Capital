import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Search, Users, MapPin, Building2, RefreshCw, ExternalLink, Filter, Briefcase } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Founder = {
  id: number;
  userId: number;
  name: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  applicationCount: number;
  investmentStatus?: string;
};

async function fetchFounders(token: string): Promise<Founder[]> {
  const res = await fetch(`${BASE}/api/admin/founders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load founders");
  return res.json();
}

export default function AdminFounders() {
  const { toast } = useToast();
  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [exporting, setExporting] = useState(false);

  const token = localStorage.getItem("auth_token") ?? "";

  useEffect(() => {
    fetchFounders(token)
      .then(setFounders)
      .catch(() => toast({ title: "Failed to load founders", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/founders/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Startling Capital-founders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "Founders list downloaded as CSV" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Unique filter values
  const sectors = ["all", ...Array.from(new Set(founders.map(f => f.sector).filter(Boolean) as string[]))];
  const stages = ["all", ...Array.from(new Set(founders.map(f => f.stage).filter(Boolean) as string[]))];
  const countries = ["all", ...Array.from(new Set(founders.map(f => f.country).filter(Boolean) as string[]))];

  const filtered = founders.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || [f.name, f.email, f.companyName, f.city, f.country, f.sector].some(v => v?.toLowerCase().includes(q));
    const matchSector = filterSector === "all" || f.sector === filterSector;
    const matchStage = filterStage === "all" || f.stage === filterStage;
    const matchCountry = filterCountry === "all" || f.country === filterCountry;
    return matchSearch && matchSector && matchStage && matchCountry;
  });

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Founder Management</h1>
              <p className="text-muted-foreground mt-1">
                All founders registered in Startling Capital Programs — view profiles, programs, and export data.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setLoading(true); fetchFounders(token).then(setFounders).finally(() => setLoading(false)); }}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 gradient-teal text-white border-0 hover:opacity-90">
                <Download className={`h-3.5 w-3.5 ${exporting ? "animate-bounce" : ""}`} />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Founders", value: founders.length, icon: Users, color: "text-teal-600 dark:text-teal-400" },
              { label: "With Applications", value: founders.filter(f => f.applicationCount > 0).length, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
              { label: "Onboarding Complete", value: founders.filter(f => f.onboardingComplete).length, icon: Users, color: "text-purple-600 dark:text-purple-400" },
              { label: "Countries", value: new Set(founders.map(f => f.country).filter(Boolean)).size, icon: MapPin, color: "text-orange-600 dark:text-orange-400" },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3">
                  <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
                  <div className="font-bold text-2xl text-foreground font-display">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search founders, companies, locations..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={filterSector} onValueChange={setFilterSector}>
                  <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Sector" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Sectors" : s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Stages" : s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Countries" : c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {filtered.length} of {founders.length} founders
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Founders Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading founders...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No founders found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(founder => (
                <Card key={founder.id} className="hover:border-primary/30 transition-colors cursor-default">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3 mb-4">
                      {founder.avatarUrl ? (
                        <img src={founder.avatarUrl} alt={founder.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {initials(founder.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground text-sm leading-tight truncate">{founder.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{founder.email}</div>
                        {founder.companyName && (
                          <div className="text-xs font-medium text-primary mt-0.5 truncate">{founder.companyName}</div>
                        )}
                      </div>
                      <Badge
                        className={`shrink-0 text-[10px] ${founder.onboardingComplete ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20" : "bg-secondary text-muted-foreground border-border"}`}
                      >
                        {founder.onboardingComplete ? "Active" : "Onboarding"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {founder.sector && (
                        <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[10px] text-muted-foreground">Sector</div>
                          <div className="text-xs font-medium text-foreground truncate">{founder.sector}</div>
                        </div>
                      )}
                      {founder.stage && (
                        <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5">
                          <div className="text-[10px] text-muted-foreground">Stage</div>
                          <div className="text-xs font-medium text-foreground truncate">{founder.stage}</div>
                        </div>
                      )}
                      {(founder.city || founder.country) && (
                        <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5 col-span-2">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Location</div>
                          <div className="text-xs font-medium text-foreground">{[founder.city, founder.country].filter(Boolean).join(", ")}</div>
                        </div>
                      )}
                    </div>

                    {(founder.investmentStatus === "portfolio" || founder.investmentStatus === "exited") && (
                      <div className="mb-3">
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50 gap-1">
                          <Briefcase className="h-2.5 w-2.5" />
                          {founder.investmentStatus === "exited" ? "Ventures Alumni" : "Startling Capital Ventures"}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {founder.applicationCount} application{founder.applicationCount !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Joined {new Date(founder.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}
                        </span>
                      </div>
                      {founder.linkedinUrl && (
                        <a href={founder.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

