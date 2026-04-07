import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useGetPrograms, useGetCohorts, useGetConfig, useGetScores, useSubmitScores } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Score() {
  const { role, user, allowedAssignments } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedRoundName, setSelectedRoundName] = useState<string>("");
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(null);

  // Judge Proxy for Admins
  const [proxyJudgeId, setProxyJudgeId] = useState<number | null>(null);

  const { data: programs, isLoading: isLoadingPrograms } = useGetPrograms();
  const { data: cohorts, isLoading: isLoadingCohorts } = useGetCohorts(
    { programId: selectedProgramId },
    { query: { enabled: !!selectedProgramId } as any }
  );

  const { data: config, isLoading: isLoadingConfig } = useGetConfig(
    { programId: selectedProgramId, cohortId: selectedCohortId },
    { query: { enabled: !!selectedProgramId && !!selectedCohortId } as any }
  );

  const activeJudgeId = role === "admin" && proxyJudgeId ? proxyJudgeId : user?.judgeId;

  const { data: scores, isLoading: isLoadingScores, refetch: refetchScores } = useGetScores(
    {
      programId: selectedProgramId,
      cohortId: selectedCohortId,
      round: selectedRoundName,
      judgeId: activeJudgeId || undefined
    },
    {
      query: {
        enabled: !!selectedProgramId && !!selectedCohortId && !!selectedRoundName && !!activeJudgeId
      } as any
    }
  );

  const submitScoresMutation = useSubmitScores();
  const { toast } = useToast();

  const [localScores, setLocalScores] = useState<Record<string, { score: number, comment?: string }>>({});

  // Initialize local scores when selecting a startup
  useEffect(() => {
    if (selectedStartupId && config && activeJudgeId) {
      const currentStartupScores = scores?.filter(s => s.startupId === selectedStartupId && s.judgeId === activeJudgeId) || [];
      const initialLocalScores: Record<string, { score: number, comment?: string }> = {};
      
      currentStartupScores.forEach(s => {
        initialLocalScores[s.criterionId] = { score: s.score, comment: s.comment || "" };
      });
      
      setLocalScores(initialLocalScores);
    } else {
      setLocalScores({});
    }
  }, [selectedStartupId, scores, config, activeJudgeId]);

  const handleScoreChange = (criterionId: string, score: number) => {
    setLocalScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], score }
    }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setLocalScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], comment }
    }));
  };

  const handleSaveScores = () => {
    if (!selectedProgramId || !selectedCohortId || !selectedRoundName || !selectedStartupId || !activeJudgeId || !config) return;

    const roundCriteria = config.rubric.filter(r => r.roundName === selectedRoundName);
    
    // Save all criteria that have been explicitly scored (including 0 = N/A)
    const rows = Object.entries(localScores).map(([criterionId, data]) => {
      const criterion = config.rubric.find(c => c.id === criterionId);
      if (!criterion) return null;
      
      return {
        programId: selectedProgramId,
        cohortId: selectedCohortId,
        roundName: selectedRoundName,
        startupId: selectedStartupId,
        judgeId: activeJudgeId,
        criterionId,
        score: data.score,
        weight: criterion.weight,
        comment: data.comment
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      toast({ title: "No scores to save", variant: "default" });
      return;
    }

    submitScoresMutation.mutate({ data: { rows } }, {
      onSuccess: () => {
        toast({ title: "Scores saved successfully", variant: "default" });
        refetchScores();
      },
      onError: (err) => {
        toast({ title: "Failed to save scores", description: err.message, variant: "destructive" });
      }
    });
  };

  // Progress computation
  const progressMap = useMemo(() => {
    if (!config || !scores || !activeJudgeId) return {};
    const map: Record<number, { completed: number, total: number }> = {};
    const roundCriteria = config.rubric.filter(r => r.roundName === selectedRoundName);
    
    config.startups.forEach(s => {
      const startupScores = scores.filter(sc => sc.startupId === s.id && sc.judgeId === activeJudgeId);
      map[s.id] = {
        completed: startupScores.length,
        total: roundCriteria.length
      };
    });
    return map;
  }, [config, scores, selectedRoundName, activeJudgeId]);

  const selectedStartup = config?.startups.find(s => s.id === selectedStartupId);
  const roundCriteria = config?.rubric.filter(r => r.roundName === selectedRoundName) || [];
  
  const allCriteriaScored = roundCriteria.length > 0 && roundCriteria.every(c => localScores[c.id]?.score !== undefined && localScores[c.id]?.score >= 0 && localScores[c.id]?.score !== null);

  // Live weighted percentage calculation
  const liveWeightedPercent = useMemo(() => {
    if (!roundCriteria.length) return null;
    const totalWeight = roundCriteria.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    if (totalWeight === 0) return null;
    let weightedSum = 0;
    let weightedScored = 0;
    for (const c of roundCriteria) {
      const score = localScores[c.id]?.score;
      const w = c.weight ?? 1;
      if (score !== undefined) {
        weightedSum += (score / 5) * w;
        weightedScored += w;
      }
    }
    if (weightedScored === 0) return null;
    return Math.round((weightedSum / totalWeight) * 100);
  }, [localScores, roundCriteria]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Scoring Workspace</h1>
            <p className="text-muted-foreground mt-1">Evaluate startups against the program rubric.</p>
          </div>

          {/* Context Selectors */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select value={selectedProgramId} onValueChange={(val) => { setSelectedProgramId(val); setSelectedCohortId(""); setSelectedRoundName(""); setSelectedStartupId(null); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cohort</Label>
                  <Select value={selectedCohortId} onValueChange={(val) => { setSelectedCohortId(val); setSelectedRoundName(""); setSelectedStartupId(null); }} disabled={!selectedProgramId || isLoadingCohorts}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select value={selectedRoundName} onValueChange={(val) => { setSelectedRoundName(val); setSelectedStartupId(null); }} disabled={!selectedCohortId || isLoadingConfig}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Round" />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.rounds.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {role === "admin" && (
                  <div className="space-y-2">
                    <Label>Proxy Judge</Label>
                    <Select value={proxyJudgeId?.toString() || ""} onValueChange={(val) => setProxyJudgeId(Number(val))} disabled={!selectedCohortId || isLoadingConfig}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Judge" />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.judges.map(j => (
                          <SelectItem key={j.id} value={j.id.toString()}>{j.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedRoundName && activeJudgeId && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Startup List Sidebar */}
              <div className="lg:col-span-1 space-y-4">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Startups</CardTitle>
                  <CardDescription>Select to score</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y border-y">
                    {config?.startups.map(startup => {
                      const prog = progressMap[startup.id] || { completed: 0, total: 0 };
                      const isComplete = prog.total > 0 && prog.completed === prog.total;
                      
                      return (
                        <button
                          key={startup.id}
                          className={`flex items-center justify-between p-4 text-left transition-colors hover:bg-accent/50 ${selectedStartupId === startup.id ? 'bg-accent border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                          onClick={() => setSelectedStartupId(startup.id)}
                        >
                          <div>
                            <div className="font-medium">{startup.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{startup.sector || 'Uncategorized'}</div>
                          </div>
                          <div>
                            {isComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <div className="text-xs font-medium text-muted-foreground">
                                {prog.completed}/{prog.total}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Live Weighted Score Panel */}
              {selectedStartupId && liveWeightedPercent !== null && (
                <Card className="h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Live Score</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">{liveWeightedPercent}%</span>
                      <p className="text-xs text-muted-foreground mt-1">Weighted score</p>
                    </div>
                    <Progress value={liveWeightedPercent} className="h-2" />
                    <div className="space-y-1">
                      {roundCriteria.map((c) => {
                        const score = localScores[c.id]?.score;
                        return (
                          <div key={c.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-[70%]">{c.name}</span>
                            <span className="font-medium text-foreground shrink-0">
                              {score !== undefined ? `${score}/5` : '-'}
                              <span className="text-muted-foreground ml-1">×{c.weight ?? 1}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>

              {/* Scoring Main Area */}
              <div className="lg:col-span-3">
                {selectedStartupId ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="bg-muted/50 border-b">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-2xl">{selectedStartup?.name}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                              {selectedStartup?.sector && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{selectedStartup.sector}</span>}
                              {selectedStartup?.stage && <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs">{selectedStartup.stage}</span>}
                              {selectedStartup?.location && <span className="text-muted-foreground">{selectedStartup.location}</span>}
                            </CardDescription>
                          </div>
                          {selectedStartup?.website && (
                            <a href={selectedStartup.website} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium">
                              Visit Website
                            </a>
                          )}
                        </div>
                        {selectedStartup?.notes && (
                          <div className="mt-4 text-sm bg-background p-3 rounded border text-muted-foreground">
                            {selectedStartup.notes}
                          </div>
                        )}
                      </CardHeader>
                    </Card>

                    <div className="space-y-4">
                      {roundCriteria.map((criterion, index) => {
                        const localData = localScores[criterion.id] || { score: 0, comment: "" };
                        
                        return (
                          <Card key={criterion.id} className="overflow-hidden">
                            <CardHeader className="bg-card">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span className="flex items-center justify-center bg-primary/20 text-primary rounded-full w-6 h-6 text-sm">
                                    {index + 1}
                                  </span>
                                  {criterion.name}
                                </CardTitle>
                                <span className="text-sm font-medium text-muted-foreground">Weight: {criterion.weight}x</span>
                              </div>
                              {criterion.description && (
                                <CardDescription className="mt-2">{criterion.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                              
                              <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                  <Label className="text-base">Score: <span className="text-primary font-bold text-lg">{localData.score !== undefined ? localData.score : '-'}</span> / 5</Label>
                                  <span className="text-xs text-muted-foreground">0 = N/A</span>
                                </div>
                                <Slider 
                                  value={[localData.score ?? 0]} 
                                  min={0} 
                                  max={5} 
                                  step={1} 
                                  onValueChange={(vals) => handleScoreChange(criterion.id, vals[0])}
                                  className="py-4"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                  <span>0</span>
                                  <span>1</span>
                                  <span>2</span>
                                  <span>3</span>
                                  <span>4</span>
                                  <span>5</span>
                                </div>
                                
                                {localData.score > 0 && (
                                  <div className="bg-accent p-3 rounded-md text-sm text-accent-foreground border border-accent-border">
                                    <span className="font-semibold mr-2">Guidance (Level {localData.score}):</span>
                                    {config?.guidance.find(g => g.criterionId === criterion.id && g.score === localData.score)?.guidanceText || "No guidance available for this level."}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 pt-2 border-t">
                                <Label className="text-muted-foreground">Comments (Optional)</Label>
                                <Textarea 
                                  placeholder="Provide rationale for your score..." 
                                  value={localData.comment || ""}
                                  onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                                  className="resize-y min-h-[80px]"
                                />
                              </div>

                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between py-4 sticky bottom-0 bg-background/80 backdrop-blur border-t z-10 px-4 -mx-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Progress value={(roundCriteria.filter(c => localScores[c.id] !== undefined).length / roundCriteria.length) * 100} className="w-32 h-2" />
                        <span>{roundCriteria.filter(c => localScores[c.id] !== undefined).length} of {roundCriteria.length} scored</span>
                      </div>
                      <Button 
                        onClick={handleSaveScores} 
                        disabled={submitScoresMutation.isPending || roundCriteria.filter(c => localScores[c.id] !== undefined).length === 0}
                        className="min-w-[120px]"
                      >
                        {submitScoresMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Scores
                      </Button>
                    </div>

                  </div>
                ) : (
                  <Card className="h-full flex items-center justify-center min-h-[400px] border-dashed">
                    <CardContent className="text-center text-muted-foreground flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                        <ChevronLeft className="h-6 w-6" />
                      </div>
                      <p className="text-lg font-medium text-foreground">Select a startup</p>
                      <p>Choose a startup from the list to begin scoring</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
          
          {!selectedRoundName && selectedCohortId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Please select a round</AlertTitle>
              <AlertDescription>You need to select a round to see the criteria and startups to score.</AlertDescription>
            </Alert>
          )}

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
