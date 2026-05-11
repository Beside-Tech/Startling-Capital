import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import {
  useAdminGetPrograms,
  useAdminGetCohorts,
  useAdminGetJudges,
  useAdminGetAssignments,
  useAdminCreateProgram,
  useAdminUpdateProgram,
  useAdminDeleteProgram,
  useAdminCreateCohort,
  useAdminUpdateCohort,
  useAdminDeleteCohort,
  useAdminCreateJudge,
  useAdminUpdateJudge,
  useAdminDeleteJudge,
  useAdminResetPin,
  useAdminCreateAssignment,
  useAdminDeleteAssignment,
  useAdminGetStartups,
  useAdminCreateStartup,
  useAdminUpdateStartup,
  useAdminDeleteStartup,
  type ResetPinResponse,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, KeyRound, X, GripVertical, ChevronUp, ChevronDown, FileText, Settings2 } from "lucide-react";

// ---- Form Field Types ----
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

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short Text",
  textarea: "Long Text / Paragraph",
  number: "Number",
  dropdown: "Dropdown",
  checkbox: "Yes / No (Checkbox)",
  date: "Date",
  file: "File Upload",
};

function FormBuilderTab() {
  const { toast } = useToast();
  const { data: programs } = useAdminGetPrograms();
  const updateMutation = useAdminUpdateProgram();
  const token = localStorage.getItem("auth_token") ?? "";
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit field modal state
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [newOptionText, setNewOptionText] = useState("");

  const loadProgramForm = async (programId: string) => {
    setSelectedProgramId(programId);
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/founder/programs/${programId}/form`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.applicationFormConfig as ApplicationFormConfig | null;
        setFields(cfg?.fields ?? []);
      } else {
        setFields([]);
      }
    } catch {
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveForm = async () => {
    if (!selectedProgramId) return;
    setIsSaving(true);
    try {
      const orderedFields = fields.map((f, i) => ({ ...f, order: i }));
      updateMutation.mutate(
        { id: selectedProgramId, data: { applicationFormConfig: { fields: orderedFields } } as Parameters<typeof updateMutation.mutate>[0]["data"] },
        {
          onSuccess: () => {
            toast({ title: "Form saved", description: "Application form configuration updated." });
          },
          onError: (e) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: FIELD_TYPE_LABELS[type],
      placeholder: "",
      required: false,
      options: type === "dropdown" ? ["Option 1", "Option 2"] : undefined,
      order: fields.length,
    };
    setEditingField({ ...newField });
    setEditingFieldIndex(fields.length);
    setNewOptionText("");
  };

  const openEditField = (field: FormField, index: number) => {
    setEditingField({ ...field, options: [...(field.options ?? [])] });
    setEditingFieldIndex(index);
    setNewOptionText("");
  };

  const saveEditingField = () => {
    if (!editingField || editingFieldIndex === null) return;
    const updatedFields = [...fields];
    if (editingFieldIndex >= fields.length) {
      updatedFields.push(editingField);
    } else {
      updatedFields[editingFieldIndex] = editingField;
    }
    setFields(updatedFields);
    setEditingField(null);
    setEditingFieldIndex(null);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...fields];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setFields(newFields);
  };

  const selectedProgram = programs?.find((p) => p.id === selectedProgramId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Form Builder</CardTitle>
        <CardDescription>Design custom application forms for each program. Founders will see these fields when applying.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Program selector */}
        <div className="mb-6">
          <Label className="mb-2 block">Select Program to Configure</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {programs?.map((p) => (
              <button
                key={p.id}
                onClick={() => loadProgramForm(p.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  selectedProgramId === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <div className="font-semibold text-sm text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                <div className="flex items-center gap-1 mt-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {((p as unknown as Record<string, unknown>).applicationFormConfig as ApplicationFormConfig | null)?.fields?.length ?? 0} fields configured
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedProgram && (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Form builder header */}
            <div className="bg-secondary/40 px-4 py-3 flex items-center justify-between border-b border-border">
              <div>
                <div className="font-semibold text-sm text-foreground">{selectedProgram.name} — Application Form</div>
                <div className="text-xs text-muted-foreground">{fields.length} field{fields.length !== 1 ? "s" : ""} configured</div>
              </div>
              <Button size="sm" onClick={saveForm} disabled={isSaving || updateMutation.isPending} className="gradient-teal text-white border-0 hover:opacity-90">
                {isSaving || updateMutation.isPending ? "Saving..." : "Save Form"}
              </Button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading form configuration...</div>
            ) : (
              <div className="p-4">
                {/* Fields list */}
                {fields.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5 group">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{field.label}</span>
                            {field.required && (
                              <span className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 rounded px-1.5 py-0.5 shrink-0">Required</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.type]}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveField(index, "up")} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => moveField(index, "down")} disabled={index === fields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEditField(field, index)} className="text-muted-foreground hover:text-primary p-1">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteField(index)} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-secondary/20 rounded-xl mb-4">
                    <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">No form fields yet</p>
                    <p className="text-xs text-muted-foreground">Add fields below to build your application form.</p>
                  </div>
                )}

                {/* Add field buttons */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add Field</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => addField(type)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        <Plus className="h-3 w-3 inline mr-1" />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Field Editor Dialog */}
      <Dialog open={!!editingField} onOpenChange={(v) => !v && setEditingField(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFieldIndex !== null && editingFieldIndex < fields.length ? "Edit Field" : "Add Field"}</DialogTitle>
            <DialogDescription>Configure this form field's label, type, and settings.</DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Field Label *</Label>
                <Input
                  placeholder="e.g. Describe your business model"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Field Type</Label>
                <Select value={editingField.type} onValueChange={(v) => {
                  const t = v as FieldType;
                  setEditingField({
                    ...editingField,
                    type: t,
                    options: t === "dropdown" ? (editingField.options?.length ? editingField.options : ["Option 1", "Option 2"]) : undefined,
                  });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([type, label]) => (
                      <SelectItem key={type} value={type}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingField.type !== "checkbox" && editingField.type !== "date" && editingField.type !== "file" && (
                <div className="space-y-1.5">
                  <Label>Placeholder Text</Label>
                  <Input
                    placeholder="Hint text shown inside the field"
                    value={editingField.placeholder ?? ""}
                    onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  />
                </div>
              )}
              {editingField.type === "dropdown" && (
                <div className="space-y-2">
                  <Label>Dropdown Options</Label>
                  {(editingField.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...(editingField.options ?? [])];
                          opts[i] = e.target.value;
                          setEditingField({ ...editingField, options: opts });
                        }}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setEditingField({ ...editingField, options: (editingField.options ?? []).filter((_, idx) => idx !== i) })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="New option..."
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newOptionText.trim()) {
                          setEditingField({ ...editingField, options: [...(editingField.options ?? []), newOptionText.trim()] });
                          setNewOptionText("");
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => {
                      if (newOptionText.trim()) {
                        setEditingField({ ...editingField, options: [...(editingField.options ?? []), newOptionText.trim()] });
                        setNewOptionText("");
                      }
                    }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={editingField.required}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <label htmlFor="field-required" className="text-sm text-foreground cursor-pointer">
                  This field is required
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
            <Button onClick={saveEditingField} disabled={!editingField?.label.trim()}>
              {editingFieldIndex !== null && editingFieldIndex < fields.length ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ProgramForm = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  active: boolean;
  phase: "pre_event" | "in_event" | "post_event";
  location: string;
  format: "in_person" | "virtual" | "hybrid";
  applicationDeadline: string;
  programStartDate: string;
  programEndDate: string;
  maxApplications: string;
  eligibility: string;
  benefits: string[];
  tags: string[];
  newBenefit: string;
  newTag: string;
};

const EMPTY_PROGRAM_FORM: ProgramForm = {
  id: "", name: "", shortDescription: "", description: "", active: true,
  phase: "pre_event", location: "", format: "hybrid",
  applicationDeadline: "", programStartDate: "", programEndDate: "",
  maxApplications: "", eligibility: "", benefits: [], tags: [],
  newBenefit: "", newTag: "",
};

function ProgramsTab() {
  const { toast } = useToast();
  const { data: programs, refetch } = useAdminGetPrograms();
  const createMutation = useAdminCreateProgram();
  const updateMutation = useAdminUpdateProgram();
  const deleteMutation = useAdminDeleteProgram();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramForm>({ ...EMPTY_PROGRAM_FORM });

  const resetForm = () => setForm({ ...EMPTY_PROGRAM_FORM });

  const handleSubmit = () => {
    if (!form.name) return;
    const data = {
      name: form.name,
      description: form.description || null,
      shortDescription: form.shortDescription || null,
      active: form.active,
      phase: form.phase,
      location: form.location || null,
      format: form.format as "in_person" | "virtual" | "hybrid",
      applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : null,
      programStartDate: form.programStartDate ? new Date(form.programStartDate).toISOString() : null,
      programEndDate: form.programEndDate ? new Date(form.programEndDate).toISOString() : null,
      maxApplications: form.maxApplications ? parseInt(form.maxApplications) : null,
      eligibility: form.eligibility || null,
      benefits: form.benefits.length > 0 ? form.benefits : null,
      tags: form.tags.length > 0 ? form.tags : null,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => { toast({ title: "Program updated" }); setShowForm(false); resetForm(); setEditingId(null); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      if (!form.id) return;
      createMutation.mutate(
        { data: { id: form.id, ...data } as Parameters<typeof createMutation.mutate>[0]["data"] },
        {
          onSuccess: () => { toast({ title: "Program created" }); setShowForm(false); resetForm(); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleEdit = (p: NonNullable<typeof programs>[number]) => {
    setEditingId(p.id);
    setForm({
      id: p.id,
      name: p.name,
      shortDescription: (p as unknown as Record<string, unknown>).shortDescription as string ?? "",
      description: p.description ?? "",
      active: p.active ?? true,
      phase: ((p as unknown as Record<string, unknown>).phase as ProgramForm["phase"]) ?? "pre_event",
      location: ((p as unknown as Record<string, unknown>).location as string) ?? "",
      format: (((p as unknown as Record<string, unknown>).format as string) ?? "hybrid") as ProgramForm["format"],
      applicationDeadline: "",
      programStartDate: "",
      programEndDate: "",
      maxApplications: String(((p as unknown as Record<string, unknown>).maxApplications as number) ?? ""),
      eligibility: ((p as unknown as Record<string, unknown>).eligibility as string) ?? "",
      benefits: ((p as unknown as Record<string, unknown>).benefits as string[]) ?? [],
      tags: ((p as unknown as Record<string, unknown>).tags as string[]) ?? [],
      newBenefit: "",
      newTag: "",
    });
    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Program deleted" }); setDeleteId(null); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const addBenefit = () => {
    if (!form.newBenefit.trim()) return;
    setForm(f => ({ ...f, benefits: [...f.benefits, f.newBenefit.trim()], newBenefit: "" }));
  };

  const removeBenefit = (i: number) => setForm(f => ({ ...f, benefits: f.benefits.filter((_, idx) => idx !== i) }));

  const addTag = () => {
    if (!form.newTag.trim()) return;
    setForm(f => ({ ...f, tags: [...f.tags, f.newTag.trim()], newTag: "" }));
  };

  const removeTag = (i: number) => setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Programs</CardTitle>
          <CardDescription>Manage Startling Capital accelerator programs — all details editable here</CardDescription>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Program
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs?.map((p) => (
            <div key={p.id} className="border border-border rounded-xl p-4 bg-card hover:bg-secondary/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-foreground text-sm">{p.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                </div>
                <Badge variant={p.active ? "default" : "secondary"} className="text-xs shrink-0">{p.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description ?? "No description"}</p>
              {((p as unknown as Record<string, unknown>).benefits as string[] | null)?.length ? (
                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Benefits</div>
                  <div className="flex flex-wrap gap-1">
                    {((p as unknown as Record<string, unknown>).benefits as string[]).slice(0, 3).map((b: string) => (
                      <span key={b} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{b}</span>
                    ))}
                    {((p as unknown as Record<string, unknown>).benefits as string[]).length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{((p as unknown as Record<string, unknown>).benefits as string[]).length - 3} more</span>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Program" : "Add Program"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update all program details visible to founders and staff." : "Create a new Startling Capital accelerator program."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* Basic Info */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Basic Info</div>
              {!editingId && (
                <div className="space-y-1">
                  <Label>Program ID (slug) <span className="text-muted-foreground font-normal">— used internally</span></Label>
                  <Input placeholder="innovator-program" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Program Name *</Label>
                <Input placeholder="Innovator Program" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Short Description <span className="text-muted-foreground font-normal">— shown on cards</span></Label>
                <Input placeholder="A brief, punchy tagline for the program" value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Full Description</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Detailed description shown on the program page..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.active ? "active" : "inactive"} onValueChange={(v) => setForm(f => ({ ...f, active: v === "active" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Phase</Label>
                  <Select value={form.phase} onValueChange={(v) => setForm(f => ({ ...f, phase: v as ProgramForm["phase"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_event">Pre-Event (Applications Open)</SelectItem>
                      <SelectItem value="in_event">In-Event (Program Running)</SelectItem>
                      <SelectItem value="post_event">Post-Event (Completed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location & Format */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Location & Format</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input placeholder="Toronto, Canada / Global" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Delivery Format</Label>
                  <Select value={form.format} onValueChange={(v) => setForm(f => ({ ...f, format: v as ProgramForm["format"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In-Person</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Max Applications</Label>
                <Input type="number" placeholder="e.g. 200" value={form.maxApplications} onChange={(e) => setForm(f => ({ ...f, maxApplications: e.target.value }))} />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Key Dates</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Application Deadline</Label>
                  <Input type="date" value={form.applicationDeadline} onChange={(e) => setForm(f => ({ ...f, applicationDeadline: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Program Start</Label>
                  <Input type="date" value={form.programStartDate} onChange={(e) => setForm(f => ({ ...f, programStartDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Program End</Label>
                  <Input type="date" value={form.programEndDate} onChange={(e) => setForm(f => ({ ...f, programEndDate: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Eligibility</div>
              <div className="space-y-1">
                <Label>Eligibility Requirements</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="e.g. Black-owned business, STEM focus, early-stage..."
                  value={form.eligibility}
                  onChange={(e) => setForm(f => ({ ...f, eligibility: e.target.value }))}
                />
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">
                Benefits <span className="text-muted-foreground font-normal normal-case">(what participants receive)</span>
              </div>
              <div className="space-y-2">
                {form.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-1.5">
                    <span className="flex-1 text-sm text-foreground">{b}</span>
                    <button onClick={() => removeBenefit(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a benefit (e.g. Executive mentorship)"
                    value={form.newBenefit}
                    onChange={(e) => setForm(f => ({ ...f, newBenefit: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addBenefit} type="button">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag, i) => (
                  <div key={i} className="flex items-center gap-1 bg-secondary border border-border rounded-full px-3 py-1">
                    <span className="text-xs text-foreground">{tag}</span>
                    <button onClick={() => removeTag(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag (e.g. STEM, Women-Led, Global)"
                  value={form.newTag}
                  onChange={(e) => setForm(f => ({ ...f, newTag: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addTag} type="button">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Program"
        description="This will permanently delete the program. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

function CohortsTab() {
  const { toast } = useToast();
  const { data: programs } = useAdminGetPrograms();
  const { data: cohorts, refetch } = useAdminGetCohorts();
  const createMutation = useAdminCreateCohort();
  const updateMutation = useAdminUpdateCohort();
  const deleteMutation = useAdminDeleteCohort();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", programId: "", name: "", year: new Date().getFullYear().toString(), active: true });

  const resetForm = () => setForm({ id: "", programId: "", name: "", year: new Date().getFullYear().toString(), active: true });

  const handleSubmit = () => {
    if (!form.name || !form.programId || !form.year) return;
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: { name: form.name, year: Number(form.year), active: form.active } },
        {
          onSuccess: () => { toast({ title: "Cohort updated" }); setShowForm(false); resetForm(); setEditingId(null); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      if (!form.id) return;
      createMutation.mutate(
        { data: { id: form.id, programId: form.programId, name: form.name, year: Number(form.year), active: form.active } },
        {
          onSuccess: () => { toast({ title: "Cohort created" }); setShowForm(false); resetForm(); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleEdit = (c: NonNullable<typeof cohorts>[number]) => {
    setEditingId(c.id);
    setForm({ id: c.id, programId: c.programId, name: c.name, year: String(c.year), active: c.active ?? true });
    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Cohort deleted" }); setDeleteId(null); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const getProgramName = (id: string) => programs?.find((p) => p.id === id)?.name ?? id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cohorts</CardTitle>
          <CardDescription>Manage program cohorts</CardDescription>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Cohort
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.id}</TableCell>
                <TableCell>{getProgramName(c.programId)}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.year}</TableCell>
                <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Cohort" : "Add Cohort"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingId && (
              <div className="space-y-1">
                <Label>ID (slug)</Label>
                <Input placeholder="gw-2025" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} />
              </div>
            )}
            {!editingId && (
              <div className="space-y-1">
                <Label>Program</Label>
                <Select value={form.programId} onValueChange={(v) => setForm((f) => ({ ...f, programId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Cohort 2025" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" placeholder="2025" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cohort-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              <Label htmlFor="cohort-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Cohort"
        description="This will permanently delete the cohort and all its data."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

function JudgesTab() {
  const { toast } = useToast();
  const { data: judges, refetch } = useAdminGetJudges();
  const createMutation = useAdminCreateJudge();
  const updateMutation = useAdminUpdateJudge();
  const deleteMutation = useAdminDeleteJudge();
  const resetPinMutation = useAdminResetPin();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetPinJudge, setResetPinJudge] = useState<{ id: number; name: string } | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "", pin: "" });

  const resetForm = () => setForm({ name: "", email: "", title: "", pin: "" });

  const handleSubmit = () => {
    if (!form.name || !form.email) return;
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: { name: form.name, email: form.email, title: form.title || undefined } },
        {
          onSuccess: () => { toast({ title: "Judge updated" }); setShowForm(false); resetForm(); setEditingId(null); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      if (!form.pin) return;
      createMutation.mutate(
        { data: { name: form.name, email: form.email, title: form.title || undefined, pin: form.pin } },
        {
          onSuccess: () => { toast({ title: "Judge created" }); setShowForm(false); resetForm(); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleEdit = (j: NonNullable<typeof judges>[number]) => {
    setEditingId(j.id);
    setForm({ name: j.name, email: j.email, title: j.title ?? "", pin: "" });
    setShowForm(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Judge deleted" }); setDeleteId(null); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleResetPin = () => {
    if (!resetPinJudge) return;
    resetPinMutation.mutate(
      { id: resetPinJudge.id, data: {} },
      {
        onSuccess: (data: ResetPinResponse) => {
          setNewPin(data.pin);
          setResetPinJudge(null);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Judges</CardTitle>
          <CardDescription>Manage scoring panel members</CardDescription>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Judge
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {judges?.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.name}</TableCell>
                <TableCell>{j.email}</TableCell>
                <TableCell className="text-muted-foreground">{j.title || "-"}</TableCell>
                <TableCell><Badge variant={j.active ? "default" : "secondary"}>{j.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" title="Reset PIN" onClick={() => setResetPinJudge({ id: j.id, name: j.name })}><KeyRound className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(j)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(j.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Judge" : "Add Judge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Jane Smith" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Title (optional)</Label>
              <Input placeholder="Senior Partner" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            {!editingId && (
              <div className="space-y-1">
                <Label>PIN (6 digits)</Label>
                <Input type="text" maxLength={6} placeholder="123456" value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPinJudge} onOpenChange={(v) => !v && setResetPinJudge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN for {resetPinJudge?.name}</DialogTitle>
            <DialogDescription>A new random PIN will be generated. Share it securely with the judge.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPinJudge(null)}>Cancel</Button>
            <Button onClick={handleResetPin} disabled={resetPinMutation.isPending}>Generate New PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newPin} onOpenChange={(v) => !v && setNewPin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New PIN Generated</DialogTitle>
            <DialogDescription>Share this PIN securely with the judge. It will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <span className="text-4xl font-mono font-bold tracking-widest text-primary bg-primary/10 px-6 py-3 rounded-lg">{newPin}</span>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewPin(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Judge"
        description="This will permanently delete the judge and their login access."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

function StartupsTab() {
  const { toast } = useToast();
  const { data: programs } = useAdminGetPrograms();
  const { data: cohorts } = useAdminGetCohorts();
  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterCohortId, setFilterCohortId] = useState("");
  const { data: startups, refetch } = useAdminGetStartups(
    {
      programId: filterProgramId && filterProgramId !== "all" ? filterProgramId : undefined,
      cohortId: filterCohortId && filterCohortId !== "all" ? filterCohortId : undefined,
    },
    { query: { enabled: true } as any }
  );
  const createMutation = useAdminCreateStartup();
  const updateMutation = useAdminUpdateStartup();
  const deleteMutation = useAdminDeleteStartup();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    programId: "", cohortId: "", name: "", sector: "", stage: "", location: "", website: "", email: "", notes: ""
  });

  const resetForm = () => setForm({ programId: "", cohortId: "", name: "", sector: "", stage: "", location: "", website: "", email: "", notes: "" });

  const handleSubmit = () => {
    if (!form.name || !form.programId || !form.cohortId) return;
    const data = {
      name: form.name,
      programId: form.programId,
      cohortId: form.cohortId,
      sector: form.sector || undefined,
      stage: form.stage || undefined,
      location: form.location || undefined,
      website: form.website || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    };
    if (editingId !== null) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => { toast({ title: "Startup updated" }); setShowForm(false); resetForm(); setEditingId(null); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => { toast({ title: "Startup created" }); setShowForm(false); resetForm(); refetch(); },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleEdit = (s: NonNullable<typeof startups>[number]) => {
    setEditingId(s.id);
    setForm({
      programId: s.programId, cohortId: s.cohortId, name: s.name,
      sector: s.sector ?? "", stage: s.stage ?? "", location: s.location ?? "",
      website: s.website ?? "", email: s.email ?? "", notes: s.notes ?? ""
    });
    setShowForm(true);
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Startup deleted" }); setDeleteId(null); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const getProgramName = (id: string) => programs?.find((p) => p.id === id)?.name ?? id;
  const getCohortName = (id: string) => cohorts?.find((c) => c.id === id)?.name ?? id;
  const filteredCohorts = cohorts?.filter((c) => !form.programId || c.programId === form.programId);
  const filterCohortOptions = cohorts?.filter((c) => !filterProgramId || filterProgramId === "all" || c.programId === filterProgramId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Startups</CardTitle>
          <CardDescription>Manage participating startups</CardDescription>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Startup
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Select value={filterProgramId} onValueChange={(v) => { setFilterProgramId(v); setFilterCohortId(""); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCohortId} onValueChange={setFilterCohortId} disabled={!filterProgramId || filterProgramId === "all"}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Cohorts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              {filterCohortOptions?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {startups?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{getProgramName(s.programId)}</TableCell>
                <TableCell>{getCohortName(s.cohortId)}</TableCell>
                <TableCell className="text-muted-foreground">{s.sector || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{s.stage || "-"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Startup" : "Add Startup"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Program</Label>
                <Select value={form.programId} onValueChange={(v) => setForm((f) => ({ ...f, programId: v, cohortId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cohort</Label>
                <Select value={form.cohortId} onValueChange={(v) => setForm((f) => ({ ...f, cohortId: v }))} disabled={!form.programId}>
                  <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                  <SelectContent>
                    {filteredCohorts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Startup name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sector</Label>
                <Input placeholder="FinTech, HealthTech..." value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Input placeholder="Seed, Series A..." value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Location</Label>
                <Input placeholder="City, Country" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="contact@startup.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Website</Label>
              <Input placeholder="https://..." value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input placeholder="Internal notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || !form.name || !form.programId || !form.cohortId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Startup"
        description="This will permanently delete the startup and all their scores."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

function AssignmentsTab() {
  const { toast } = useToast();
  const { data: programs } = useAdminGetPrograms();
  const { data: cohorts } = useAdminGetCohorts();
  const { data: judges } = useAdminGetJudges();
  const { data: assignments, refetch } = useAdminGetAssignments();
  const createMutation = useAdminCreateAssignment();
  const deleteMutation = useAdminDeleteAssignment();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ programId: "", cohortId: "", judgeId: "" });

  const resetForm = () => setForm({ programId: "", cohortId: "", judgeId: "" });

  const handleSubmit = () => {
    if (!form.programId || !form.cohortId || !form.judgeId) return;
    createMutation.mutate(
      { data: { programId: form.programId, cohortId: form.cohortId, judgeId: Number(form.judgeId) } },
      {
        onSuccess: () => { toast({ title: "Assignment created" }); setShowForm(false); resetForm(); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Assignment removed" }); setDeleteId(null); refetch(); },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const filteredCohorts = cohorts?.filter((c) => !form.programId || c.programId === form.programId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Judge Assignments</CardTitle>
          <CardDescription>Control which judges can score which program cohorts</CardDescription>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Assignment
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judge</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.judgeName || `ID: ${a.judgeId}`}</TableCell>
                <TableCell>{a.programName || a.programId}</TableCell>
                <TableCell>{a.cohortName || a.cohortId}</TableCell>
                <TableCell><Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>Grant a judge access to score a specific cohort.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Judge</Label>
              <Select value={form.judgeId} onValueChange={(v) => setForm((f) => ({ ...f, judgeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select judge" /></SelectTrigger>
                <SelectContent>
                  {judges?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Program</Label>
              <Select value={form.programId} onValueChange={(v) => setForm((f) => ({ ...f, programId: v, cohortId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cohort</Label>
              <Select value={form.cohortId} onValueChange={(v) => setForm((f) => ({ ...f, cohortId: v }))} disabled={!form.programId}>
                <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                <SelectContent>
                  {filteredCohorts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.programId || !form.cohortId || !form.judgeId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Remove Assignment"
        description="This will revoke the judge's access to score this cohort."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

export default function AdminManage() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Data</h1>
            <p className="text-muted-foreground mt-1">Configure programs, cohorts, judges, and assignments.</p>
          </div>

          <Tabs defaultValue="programs" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
              <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
              <TabsTrigger value="startups">Startups</TabsTrigger>
              <TabsTrigger value="judges">Judges</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="programs"><ProgramsTab /></TabsContent>
            <TabsContent value="form-builder"><FormBuilderTab /></TabsContent>
            <TabsContent value="cohorts"><CohortsTab /></TabsContent>
            <TabsContent value="startups"><StartupsTab /></TabsContent>
            <TabsContent value="judges"><JudgesTab /></TabsContent>
            <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

