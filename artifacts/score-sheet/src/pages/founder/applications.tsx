import { useEffect, useState } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, ChevronRight, Plus, Inbox } from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Application = {
  id: number;
  programId: string;
  cohortId: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  programName: string | null;
  cohortName: string | null;
  cohortYear: number | null;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:        { label: "Draft",         color: "bg-secondary text-muted-foreground border-border" },
  submitted:    { label: "Submitted",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200" },
  under_review: { label: "Under Review",  color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50" },
  accepted:     { label: "Accepted",      color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50" },
  rejected:     { label: "Not Selected",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default function FounderApplicationsPage() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <ApplicationsInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function ApplicationsInner() {
  const [, navigate] = useLocation();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token") ?? "";
    fetch(`${BASE}/api/founder/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            My Applications
          </h1>
          <p className="text-muted-foreground mt-1">Track all your program applications and their status.</p>
        </div>
        <Button
          className="gap-2 gradient-teal text-white border-0 hover:opacity-90"
          onClick={() => navigate("/founder/apply")}
        >
          <Plus className="h-4 w-4" />
          Apply to a Program
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading applications...</div>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-foreground font-medium mb-1">No applications yet</p>
            <p className="text-muted-foreground text-sm mb-4">Apply to a Nobellum program to get started.</p>
            <Button onClick={() => navigate("/founder/apply")} className="gradient-teal text-white border-0 hover:opacity-90">
              Browse Programs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const meta = STATUS_META[app.status] ?? STATUS_META.draft;
            return (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{app.programName ?? app.programId}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.cohortName ?? app.cohortId}
                      {app.cohortYear ? ` · ${app.cohortYear}` : ""}
                    </p>
                  </div>
                  <Badge className={`text-xs border ${meta.color} shrink-0`}>{meta.label}</Badge>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Calendar className="h-3 w-3" />
                    {app.submittedAt ? `Submitted ${formatDate(app.submittedAt)}` : `Saved ${formatDate(app.createdAt)}`}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
