import { useEffect, useState } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2, Users, Database, Globe, Linkedin } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

function initials(name: string) {
  return name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "F";
}

export default function LPFounders() {
  return (
    <ProtectedRoute lpOnly>
      <LPLayout>
        <FoundersInner />
      </LPLayout>
    </ProtectedRoute>
  );
}

function FoundersInner() {
  const [, navigate] = useLocation();
  const [founders, setFounders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/lp/founders`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setFounders(d?.founders || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Our Founders
        </h1>
        <p className="text-muted-foreground mt-1">Portfolio founders in the Startling Capital Ventures ecosystem.</p>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : founders.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No founders in the portfolio yet.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {founders.map(founder => (
            <Card key={founder.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl gradient-teal flex items-center justify-center text-white font-bold shrink-0">
                    {initials(founder.name || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{founder.name}</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50 border text-xs dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50">Portfolio</Badge>
                    </div>
                    {founder.companyName && <p className="text-sm font-medium text-foreground">{founder.companyName}</p>}
                    <p className="text-xs text-muted-foreground">{[founder.sector, founder.stage, founder.country].filter(Boolean).join(" · ")}</p>
                    {founder.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{founder.bio}</p>}
                    <div className="flex items-center gap-3 mt-3">
                      {founder.linkedinUrl && (
                        <a href={founder.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/lp/data-room/${founder.id}`)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Database className="h-3 w-3" /> View Data Room
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

