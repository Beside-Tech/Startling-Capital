import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useGetPrograms, useGetCohorts, useGetConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

export default function AdminExport() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedRoundName, setSelectedRoundName] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: programs } = useGetPrograms();
  const { data: cohorts } = useGetCohorts(
    { programId: selectedProgramId },
    { query: { enabled: !!selectedProgramId } as any }
  );
  const { data: config } = useGetConfig(
    { programId: selectedProgramId, cohortId: selectedCohortId },
    { query: { enabled: !!selectedProgramId && !!selectedCohortId } as any }
  );

  const handleExport = async () => {
    if (!selectedProgramId || !selectedCohortId || !selectedRoundName) return;
    
    setIsExporting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const url = `/api/export/excel?programId=${selectedProgramId}&cohortId=${selectedCohortId}&round=${selectedRoundName}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `nobellum-scores-${selectedProgramId}-${selectedCohortId}-${selectedRoundName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      // Could add toast here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
            <p className="text-muted-foreground mt-1">Download detailed scoring matrices and analytics to Excel.</p>
          </div>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <CardTitle>Configure Export</CardTitle>
              <CardDescription>Select the target data scope. The Excel file will include raw scores, judge analytics, and rankings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 border-t">
              <Button onClick={handleExport} disabled={!selectedRoundName || isExporting} className="w-full">
                {isExporting ? <Download className="mr-2 h-4 w-4 animate-bounce" /> : <Download className="mr-2 h-4 w-4" />}
                Download Excel Report
              </Button>
            </CardFooter>
          </Card>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
