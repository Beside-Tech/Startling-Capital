import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useGetAdvancePreview, useGetPrograms, useGetCohorts, useGetConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminAdvance() {
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

  const { data: preview, isLoading } = useGetAdvancePreview(
    { programId: selectedProgramId, cohortId: selectedCohortId, fromRound: selectedRoundName },
    { query: { enabled: !!selectedProgramId && !!selectedCohortId && !!selectedRoundName } as any }
  );

  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advancement Preview</h1>
            <p className="text-muted-foreground mt-1">Preview which startups meet the criteria to advance to the next round based on current scores.</p>
          </div>

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
                  <Label>From Round</Label>
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

          {preview && preview.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Advancement Results</CardTitle>
                    <CardDescription>Based on rules: {preview[0]?.thresholdPct}% minimum score, min {preview[0]?.minJudges} judges</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default">{preview.filter(p => p.decision === "advance").length} Advancing</Badge>
                    <Badge variant="secondary">{preview.filter(p => p.decision === "hold").length} Held</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                      <TableHead className="text-right">Judges</TableHead>
                      <TableHead className="text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map(item => (
                      <TableRow key={item.startupId} className={item.decision === "advance" ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{item.startupName}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={item.avgPct >= item.thresholdPct ? "text-primary font-bold" : ""}>
                            {item.avgPct.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.judgeCount >= item.minJudges ? "" : "text-destructive"}>
                            {item.judgeCount} / {item.minJudges}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.decision === "advance" ? (
                            <Badge variant="default" className="bg-primary hover:bg-primary">Advance</Badge>
                          ) : (
                            <Badge variant="outline">Hold</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : selectedRoundName && !isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No advancement preview available. Ensure advancement rules are configured for this round.
              </CardContent>
            </Card>
          ) : null}

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
