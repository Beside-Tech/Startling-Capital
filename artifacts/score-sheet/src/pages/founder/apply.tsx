import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ProtectedRoute } from "@/lib/auth";
import { FounderLayout } from "@/components/founder-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Rocket,
  MapPin,
  Calendar,
  Users,
  Layers,
  ChevronRight,
  FileText,
  Loader2,
  Send,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FieldType = "text" | "textarea" | "number" | "dropdown" | "checkbox" | "date" | "file";

type FormField = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
};

type ApplicationFormConfig = {
  fields: FormField[];
};

type Program = {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  active: boolean;
  phase: "pre_event" | "in_event" | "post_event";
  applicationDeadline?: string | null;
  applicationFormConfig?: ApplicationFormConfig | null;
  eligibility?: string | null;
  benefits?: string[] | null;
  format?: string;
  location?: string | null;
  tags?: string[] | null;
};

type Cohort = {
  id: string;
  programId: string;
  name: string;
  year: number;
  active: boolean;
};

type Application = {
  id: number;
  programId: string;
  cohortId: string;
  status: string;
  submittedAt?: string;
};

const PHASE_LABEL: Record<string, string> = {
  pre_event: "Applications Open",
  in_event: "Program Running",
  post_event: "Completed",
};

const PHASE_COLOR: Record<string, string> = {
  pre_event: "bg-green-500/10 text-green-600 dark:text-green-400",
  in_event: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  post_event: "bg-secondary text-muted-foreground",
};

function ProgramCard({ program, onApply, alreadyApplied }: {
  program: Program;
  onApply: (program: Program) => void;
  alreadyApplied: boolean;
}) {
  const canApply = program.active && program.phase === "pre_event" && !alreadyApplied;

  return (
    <Card className="border-border hover:border-primary/30 transition-colors card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{program.name}</CardTitle>
            {program.shortDescription && (
              <CardDescription className="mt-0.5 line-clamp-2">{program.shortDescription}</CardDescription>
            )}
          </div>
          <Badge className={`text-xs shrink-0 border-transparent ${PHASE_COLOR[program.phase]}`}>
            {PHASE_LABEL[program.phase]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {program.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{program.location}</span>
              {program.format && <span className="capitalize">· {program.format.replace("_", "-")}</span>}
            </div>
          )}
          {program.applicationDeadline && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Deadline: {new Date(program.applicationDeadline).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          )}
          {program.applicationFormConfig?.fields?.length ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>{program.applicationFormConfig.fields.length} application questions</span>
            </div>
          ) : null}
        </div>

        {program.tags && program.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {program.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {program.benefits && program.benefits.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">What you'll get</div>
            <div className="space-y-1">
              {program.benefits.slice(0, 3).map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-xs text-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  {b}
                </div>
              ))}
              {program.benefits.length > 3 && (
                <div className="text-xs text-muted-foreground">+{program.benefits.length - 3} more benefits</div>
              )}
            </div>
          </div>
        )}

        {alreadyApplied ? (
          <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Application submitted</span>
          </div>
        ) : canApply ? (
          <Button
            size="sm"
            className="w-full gap-2 gradient-teal text-white border-0 hover:opacity-90"
            onClick={() => onApply(program)}
          >
            Apply Now <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>
            {program.phase === "post_event" ? "Program Completed" : "Applications Closed"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FileUploadField({ fieldId, token, value, onChange }: {
  fieldId: string;
  token: string;
  value: string;
  onChange: (fieldId: string, value: string) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Upload failed");
      }
      const data = await res.json();
      onChange(fieldId, data.url);
      toast({ title: "File uploaded", description: `${file.name} uploaded successfully` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: msg, variant: "destructive" });
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-secondary/40 cursor-pointer hover:bg-secondary/60 transition-colors text-sm ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <Loader2 className={`h-4 w-4 ${uploading ? "animate-spin" : "hidden"}`} />
        {!uploading && <FileText className="h-4 w-4 text-muted-foreground" />}
        <span className="text-muted-foreground">{uploading ? "Uploading..." : "Choose file"}</span>
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
        />
      </label>
      {(value || fileName) && (
        <span className="text-sm text-primary truncate max-w-[180px]">
          {fileName || value.split("/").pop()}
        </span>
      )}
    </div>
  );
}

function DynamicFormRenderer({ fields, answers, onChange, token }: {
  fields: FormField[];
  answers: Record<string, string | boolean>;
  onChange: (fieldId: string, value: string | boolean) => void;
  token: string;
}) {
  const sorted = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      {sorted.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              placeholder={field.placeholder}
              value={(answers[field.id] as string) ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="bg-secondary/40"
            />
          )}

          {field.type === "textarea" && (
            <textarea
              placeholder={field.placeholder}
              value={(answers[field.id] as string) ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full min-h-[100px] rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          )}

          {field.type === "number" && (
            <Input
              type="number"
              placeholder={field.placeholder}
              value={(answers[field.id] as string) ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="bg-secondary/40"
            />
          )}

          {field.type === "date" && (
            <Input
              type="date"
              value={(answers[field.id] as string) ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="bg-secondary/40"
            />
          )}

          {field.type === "dropdown" && field.options && (
            <select
              value={(answers[field.id] as string) ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-secondary/40 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select an option...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === "checkbox" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={field.id}
                checked={(answers[field.id] as boolean) ?? false}
                onChange={(e) => onChange(field.id, e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor={field.id} className="text-sm text-muted-foreground cursor-pointer">
                Yes
              </label>
            </div>
          )}

          {field.type === "file" && (
            <FileUploadField
              fieldId={field.id}
              token={token}
              value={(answers[field.id] as string) ?? ""}
              onChange={(id, val) => onChange(id, val)}
            />
          )}

        </div>
      ))}
    </div>
  );
}

function ApplicationFormModal({
  program,
  cohorts,
  onClose,
  onSuccess,
}: {
  program: Program;
  cohorts: Cohort[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const token = localStorage.getItem("auth_token") ?? "";
  const programCohorts = cohorts.filter((c) => c.programId === program.id && c.active);
  const [selectedCohortId, setSelectedCohortId] = useState(programCohorts[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = program.applicationFormConfig?.fields ?? [];
  const hasFields = fields.length > 0;

  const handleAnswerChange = (fieldId: string, value: string | boolean) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateRequired = () => {
    if (!selectedCohortId) return false;
    for (const field of fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === "" || val === false) return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedCohortId) {
      toast({ title: "Please select a cohort", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/founder/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          programId: program.id,
          cohortId: selectedCohortId,
          answers,
          status: "submitted",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }
      toast({ title: "Application submitted!", description: `You've successfully applied to ${program.name}. We'll be in touch.` });
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 rounded-t-2xl flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-foreground truncate">{program.name}</h2>
            <p className="text-xs text-muted-foreground">Application Form</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Eligibility notice */}
          {program.eligibility && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <div className="text-xs font-semibold text-primary mb-1">Eligibility Requirements</div>
              <p className="text-xs text-foreground/80 leading-relaxed">{program.eligibility}</p>
            </div>
          )}

          {/* Cohort selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Cohort <span className="text-destructive">*</span></Label>
            {programCohorts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {programCohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    onClick={() => setSelectedCohortId(cohort.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      selectedCohortId === cohort.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/40"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{cohort.name}</div>
                      <div className="text-xs text-muted-foreground">{cohort.year}</div>
                    </div>
                    {selectedCohortId === cohort.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-secondary/40 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">No active cohorts available for this program.</p>
              </div>
            )}
          </div>

          {/* Dynamic form fields */}
          {hasFields ? (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Application Questions</div>
              <DynamicFormRenderer fields={fields} answers={answers} onChange={handleAnswerChange} token={token} />
            </div>
          ) : (
            <div className="bg-secondary/40 border border-border border-dashed rounded-xl p-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No custom questions configured</p>
              <p className="text-xs text-muted-foreground">Just select a cohort above and submit your application.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 rounded-b-2xl flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            className="flex-1 gap-2 gradient-teal text-white border-0 hover:opacity-90"
            onClick={handleSubmit}
            disabled={isSubmitting || !validateRequired() || programCohorts.length === 0}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="h-4 w-4" /> Submit Application</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FounderApply() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("auth_token") ?? "";

  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        fetch(`${BASE}/api/founder/programs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE}/api/founder/cohorts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE}/api/founder/applications`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pRes.ok) setPrograms(await pRes.json());
      if (cRes.ok) setCohorts(await cRes.json());
      if (aRes.ok) setApplications(await aRes.json());
    } catch {
      toast({ title: "Failed to load programs", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const isAlreadyApplied = (programId: string) =>
    applications.some((a) => a.programId === programId && a.status !== "withdrawn");

  const openPrograms = programs.filter((p) => p.active && p.phase === "pre_event");
  const otherPrograms = programs.filter((p) => !p.active || p.phase !== "pre_event");

  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/founder/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Browse Programs</h1>
              <p className="text-muted-foreground text-sm">Find and apply to Startling Capital accelerator programs</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Open for applications */}
              {openPrograms.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="font-display font-bold text-lg text-foreground">Open for Applications</h2>
                    <Badge className="text-xs bg-green-500/10 text-green-600 border-transparent">
                      {openPrograms.length} program{openPrograms.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {openPrograms.map((program) => (
                      <ProgramCard
                        key={program.id}
                        program={program}
                        onApply={setSelectedProgram}
                        alreadyApplied={isAlreadyApplied(program.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other programs */}
              {otherPrograms.length > 0 && (
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground mb-4">Other Programs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {otherPrograms.map((program) => (
                      <ProgramCard
                        key={program.id}
                        program={program}
                        onApply={setSelectedProgram}
                        alreadyApplied={isAlreadyApplied(program.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {programs.length === 0 && (
                <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
                  <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground text-lg mb-2">No programs available</h3>
                  <p className="text-muted-foreground text-sm">
                    Startling Capital programs will appear here when they're open. Check back soon!
                  </p>
                </div>
              )}

              {/* My Applications summary */}
              {applications.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">My Application History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {applications.map((app) => {
                        const prog = programs.find((p) => p.id === app.programId);
                        return (
                          <div key={app.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-foreground">{prog?.name ?? app.programId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {app.submittedAt && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(app.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                              <Badge className={`text-xs border-transparent capitalize ${
                                app.status === "submitted" ? "bg-blue-500/10 text-blue-600" :
                                app.status === "accepted" ? "bg-green-500/10 text-green-600" :
                                app.status === "shortlisted" ? "bg-purple-500/10 text-purple-600" :
                                "bg-secondary text-muted-foreground"
                              }`}>
                                {app.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 gap-2"
                      onClick={() => navigate("/founder/dashboard")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Application form modal */}
        {selectedProgram && (
          <ApplicationFormModal
            program={selectedProgram}
            cohorts={cohorts}
            onClose={() => setSelectedProgram(null)}
            onSuccess={() => {
              setSelectedProgram(null);
              loadData();
            }}
          />
        )}
      </FounderLayout>
    </ProtectedRoute>
  );
}

