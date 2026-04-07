import { useState, useEffect, useCallback } from "react";
import { LPLayout } from "@/components/lp-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Calendar, CheckCircle, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export default function LPCapitalCalls() {
  return (
    <ProtectedRoute>
      <LPLayout>
        <LPCapitalCallsInner />
      </LPLayout>
    </ProtectedRoute>
  );
}

function LPCapitalCallsInner() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${BASE}/api/lp/capital-calls`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (r.ok) setCalls(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = calls.reduce((s, c) => s + (c.allocatedAmountCad ? Number(c.allocatedAmountCad) : 0), 0);
  const paid = calls.filter(c => c.paidAt).reduce((s, c) => s + (c.allocatedAmountCad ? Number(c.allocatedAmountCad) : 0), 0);
  const pending = total - paid;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Capital Calls</h1>
        <p className="text-muted-foreground mt-1">Your capital call history and outstanding obligations.</p>
      </div>

      {!loading && calls.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Called</p>
                <p className="font-bold text-lg">${total.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-lg text-green-700">${paid.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="font-bold text-lg text-amber-700">${pending.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : calls.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No capital calls have been issued to your account yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {calls.map((c) => (
            <Card key={c.allocationId}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.title}</span>
                      <Badge className={STATUS_COLOR[c.status] ?? ""}>{c.status}</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {c.callDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {c.callDate}</span>}
                      {c.dueDate && <span className="flex items-center gap-1">Due {c.dueDate}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {c.allocatedAmountCad && (
                      <p className="font-bold text-lg">${Number(c.allocatedAmountCad).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">CAD</span></p>
                    )}
                    {c.paidAt ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 gap-1 mt-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 mt-1 dark:bg-amber-900/40 dark:text-amber-300">Pending</Badge>
                    )}
                  </div>
                </div>
                {c.notes && <p className="text-sm text-muted-foreground mt-2">{c.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
