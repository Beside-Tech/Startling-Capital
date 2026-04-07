import { useEffect, useState } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { Loader2, Database, FileText, Download, ArrowLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

const CAT_COLORS: Record<string, string> = {
  pitch_deck: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
  financial_model: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50",
  legal: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
  product: "bg-violet-100 text-violet-800 border-violet-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600",
};

export default function LPDataRoom() {
  return (
    <ProtectedRoute lpOnly>
      <LPLayout>
        <DataRoomInner />
      </LPLayout>
    </ProtectedRoute>
  );
}

function DataRoomInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ founderId: string }>();
  const founderId = params.founderId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!founderId) return;
    fetch(`${BASE}/api/lp/data-room/${founderId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [founderId]);

  if (loading) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!data) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Data room not found or not accessible.</p>
      <button onClick={() => navigate("/lp/founders")} className="mt-3 text-primary hover:underline text-sm">← Back to founders</button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/lp/founders")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> {data.founder?.companyName || data.founder?.name}'s Data Room
          </h1>
          <p className="text-muted-foreground mt-0.5">Shared by {data.founder?.name}</p>
        </div>
      </div>

      {data.files?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No documents have been shared yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.files?.map((file: any) => (
            <Card key={file.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-medium">{file.originalName}</p>
                    <Badge className={`text-xs border ${CAT_COLORS[file.category] || CAT_COLORS.other}`}>{file.category?.replace("_", " ")}</Badge>
                  </div>
                  {file.description && <p className="text-xs text-muted-foreground">{file.description}</p>}
                  <p className="text-xs text-muted-foreground">{formatBytes(file.fileSize)} · {new Date(file.uploadedAt).toLocaleDateString("en-CA")}</p>
                </div>
                <a
                  href={`${BASE}/api/storage${file.storageKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
