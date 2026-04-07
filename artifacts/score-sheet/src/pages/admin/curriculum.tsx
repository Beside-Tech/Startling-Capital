import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Video,
  Users,
  FileText,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2,
  Clock,
  Circle,
  Upload,
  Link2,
  UserPlus,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("auth_token") ?? "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const headers = opts?.body instanceof FormData
    ? { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}`, ...(opts?.headers as Record<string, string> ?? {}) }
    : { ...authHeaders(), ...(opts?.headers as Record<string, string> ?? {}) };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

type CourseType = "video" | "workshop" | "reading" | "live_session";

interface Course {
  id: number;
  title: string;
  description: string | null;
  type: CourseType;
  durationMins: number | null;
  url: string | null;
  fileUrl: string | null;
  active: boolean;
  createdAt: string;
}

interface Cohort {
  id: string;
  name: string;
  programId: string;
  year: number;
  active: boolean;
}

interface FounderOption {
  id: number;
  userId: number;
  name: string;
  email: string;
  companyName: string | null;
}

interface ProgramCourse {
  id: number;
  programId: string;
  cohortId: string;
  courseId: number;
  displayOrder: number;
  required: boolean;
  courseTitle: string;
  courseType: CourseType;
  courseDurationMins: number | null;
  courseUrl: string | null;
  courseActive: boolean;
  cohortName: string;
}

interface FounderCourseAssignment {
  id: number;
  founderId: number;
  courseId: number;
  required: boolean;
  createdAt: string;
  courseTitle: string | null;
  courseType: CourseType | null;
  courseDurationMins: number | null;
  courseActive: boolean | null;
  founderName: string | null;
  founderEmail: string | null;
}

interface ProgressItem {
  courseId: number;
  courseTitle: string;
  courseType: CourseType;
  courseDurationMins: number | null;
  displayOrder: number;
  required: boolean;
  totalFounders: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
}

const TYPE_LABELS: Record<CourseType, string> = {
  video: "Video",
  workshop: "Workshop",
  reading: "Reading",
  live_session: "Live Session",
};

const TYPE_ICON: Record<CourseType, React.ElementType> = {
  video: Video,
  workshop: Users,
  reading: BookOpen,
  live_session: Radio,
};

const TYPE_COLOR: Record<CourseType, string> = {
  video: "bg-blue-100 text-blue-700",
  workshop: "bg-purple-100 text-purple-700",
  reading: "bg-amber-100 text-amber-700",
  live_session: "bg-green-100 text-green-700",
};

function TypeBadge({ type }: { type: CourseType }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[type]}`}>
      <Icon className="h-3 w-3" />
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function AdminCurriculum() {
  return (
    <ProtectedRoute adminOnly>
      <AdminCurriculumInner />
    </ProtectedRoute>
  );
}

function AdminCurriculumInner() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    type: "video" as CourseType,
    durationMins: "",
    url: "",
  });
  const [fileMode, setFileMode] = useState<"url" | "file">("url");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignCohortId, setAssignCohortId] = useState("");
  const [assignCourseId, setAssignCourseId] = useState("");
  const [assignRequired, setAssignRequired] = useState(false);

  const [showFounderAssignDialog, setShowFounderAssignDialog] = useState(false);
  const [assignFounderId, setAssignFounderId] = useState("");
  const [assignFounderCourseId, setAssignFounderCourseId] = useState("");
  const [assignFounderRequired, setAssignFounderRequired] = useState(false);

  const [selectedProgressCohort, setSelectedProgressCohort] = useState("");
  const [expandedProgress, setExpandedProgress] = useState(false);
  const [expandedFounderAssignments, setExpandedFounderAssignments] = useState(false);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: () => apiFetch("/api/admin/courses"),
  });

  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["admin-cohorts"],
    queryFn: () => apiFetch("/api/admin/cohorts"),
  });

  const { data: founders = [] } = useQuery<FounderOption[]>({
    queryKey: ["admin-founders-list"],
    queryFn: () => apiFetch("/api/admin/founders"),
  });

  const { data: assignments = [] } = useQuery<ProgramCourse[]>({
    queryKey: ["admin-program-courses"],
    queryFn: () => apiFetch("/api/admin/program-courses"),
  });

  const { data: founderAssignments = [] } = useQuery<FounderCourseAssignment[]>({
    queryKey: ["admin-founder-course-assignments"],
    queryFn: () => apiFetch("/api/admin/founder-course-assignments"),
  });

  const { data: progressData = [] } = useQuery<ProgressItem[]>({
    queryKey: ["admin-program-courses-progress", selectedProgressCohort],
    queryFn: () =>
      selectedProgressCohort
        ? apiFetch(`/api/admin/program-courses/progress?cohortId=${selectedProgressCohort}`)
        : Promise.resolve([]),
    enabled: !!selectedProgressCohort,
  });

  const createCourse = useMutation({
    mutationFn: async (data: typeof courseForm & { fileUrl?: string }) =>
      apiFetch("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          durationMins: data.durationMins ? parseInt(data.durationMins) : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course created" });
      setShowCourseDialog(false);
    },
    onError: (e: Error) =>
      toast({ title: e.message ?? "Failed to create course", variant: "destructive" }),
  });

  const updateCourse = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof courseForm> & { fileUrl?: string } }) =>
      apiFetch(`/api/admin/courses/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          durationMins: data.durationMins ? parseInt(data.durationMins) : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-program-courses"] });
      toast({ title: "Course updated" });
      setShowCourseDialog(false);
      setEditingCourse(null);
    },
    onError: (e: Error) =>
      toast({ title: e.message ?? "Failed to update course", variant: "destructive" }),
  });

  const deleteCourse = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-program-courses"] });
      toast({ title: "Course deleted" });
    },
    onError: () => toast({ title: "Failed to delete course", variant: "destructive" }),
  });

  const assignCourse = useMutation({
    mutationFn: () => {
      const cohort = cohorts.find((c) => c.id === assignCohortId);
      return apiFetch("/api/admin/program-courses", {
        method: "POST",
        body: JSON.stringify({
          programId: cohort?.programId,
          cohortId: assignCohortId,
          courseId: parseInt(assignCourseId),
          required: assignRequired,
          displayOrder: assignments.filter((a) => a.cohortId === assignCohortId).length,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-program-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-program-courses-progress", assignCohortId] });
      toast({ title: "Course assigned to cohort" });
      setShowAssignDialog(false);
      setAssignCohortId("");
      setAssignCourseId("");
      setAssignRequired(false);
    },
    onError: (e: Error) =>
      toast({ title: e.message ?? "Failed to assign course", variant: "destructive" }),
  });

  const removeAssignment = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/program-courses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-program-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-program-courses-progress", selectedProgressCohort] });
      toast({ title: "Assignment removed" });
    },
    onError: () => toast({ title: "Failed to remove assignment", variant: "destructive" }),
  });

  const assignCourseToFounder = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/founder-course-assignments", {
        method: "POST",
        body: JSON.stringify({
          founderId: parseInt(assignFounderId),
          courseId: parseInt(assignFounderCourseId),
          required: assignFounderRequired,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-founder-course-assignments"] });
      toast({ title: "Course assigned to founder" });
      setShowFounderAssignDialog(false);
      setAssignFounderId("");
      setAssignFounderCourseId("");
      setAssignFounderRequired(false);
    },
    onError: (e: Error) =>
      toast({ title: e.message ?? "Failed to assign course to founder", variant: "destructive" }),
  });

  const removeFounderAssignment = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/founder-course-assignments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-founder-course-assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: () => toast({ title: "Failed to remove assignment", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", type: "video", durationMins: "", url: "" });
    setFileMode("url");
    setUploadFile(null);
    setShowCourseDialog(true);
  }

  function openEditDialog(course: Course) {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description ?? "",
      type: course.type,
      durationMins: course.durationMins ? String(course.durationMins) : "",
      url: course.url ?? "",
    });
    setFileMode(course.fileUrl ? "file" : "url");
    setUploadFile(null);
    setShowCourseDialog(true);
  }

  async function handleCourseSubmit() {
    if (!courseForm.title.trim()) return;

    let fileUrl: string | undefined;

    if (fileMode === "file" && uploadFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", uploadFile);
        const result = await apiFetch("/api/upload", { method: "POST", body: fd });
        fileUrl = result.url;
      } catch (e) {
        toast({ title: "File upload failed", variant: "destructive" });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload: typeof courseForm & { fileUrl?: string } = {
      ...courseForm,
      url: fileMode === "url" ? courseForm.url : "",
      fileUrl,
    };

    if (editingCourse) {
      updateCourse.mutate({ id: editingCourse.id, data: payload });
    } else {
      createCourse.mutate(payload);
    }
  }

  const groupedAssignments = assignments.reduce<Record<string, ProgramCourse[]>>((acc, a) => {
    if (!acc[a.cohortId]) acc[a.cohortId] = [];
    acc[a.cohortId].push(a);
    return acc;
  }, {});

  const isPending = createCourse.isPending || updateCourse.isPending || uploading;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Curriculum</h1>
          <p className="text-muted-foreground mt-1">Manage the course library and assign modules to cohorts or individual founders.</p>
        </div>

        {/* Course Library */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Course Library
            </CardTitle>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              New Course
            </Button>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No courses yet. Create your first course to get started.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{course.title}</p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={course.type} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {course.durationMins ? `${course.durationMins} min` : "—"}
                        </TableCell>
                        <TableCell>
                          {course.url ? (
                            <a
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 line-clamp-1 max-w-[140px]"
                            >
                              <Link2 className="h-3 w-3 flex-shrink-0" /> Link
                            </a>
                          ) : course.fileUrl ? (
                            <a
                              href={`${BASE}${course.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                            >
                              <Upload className="h-3 w-3 flex-shrink-0" /> File
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={course.active ? "default" : "secondary"}>
                            {course.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(course)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Delete "${course.title}"? This cannot be undone.`)) {
                                  deleteCourse.mutate(course.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cohort Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Cohort Curriculum
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAssignDialog(true)}
              disabled={courses.length === 0 || cohorts.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Assign Course
            </Button>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedAssignments).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No courses assigned to cohorts yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedAssignments).map(([cohortId, items]) => (
                  <div key={cohortId} className="rounded-md border">
                    <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between">
                      <p className="font-medium text-sm">{items[0].cohortName ?? cohortId}</p>
                      <span className="text-xs text-muted-foreground">
                        {items.length} course{items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Table>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="w-8 text-muted-foreground text-xs">{item.displayOrder + 1}</TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{item.courseTitle}</p>
                            </TableCell>
                            <TableCell>
                              <TypeBadge type={item.courseType} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.courseDurationMins ? `${item.courseDurationMins} min` : "—"}
                            </TableCell>
                            <TableCell>
                              {item.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAssignment.mutate(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Individual Founder Assignments */}
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between cursor-pointer"
            onClick={() => setExpandedFounderAssignments(!expandedFounderAssignments)}
          >
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Individual Founder Assignments
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFounderAssignDialog(true);
                }}
                disabled={courses.length === 0 || founders.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Assign to Founder
              </Button>
              {expandedFounderAssignments ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedFounderAssignments && (
            <CardContent>
              {founderAssignments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No individual founder assignments yet.</p>
                  <p className="text-xs mt-1">Assign a course directly to a specific founder outside their cohort curriculum.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Founder</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {founderAssignments.map((fa) => (
                        <TableRow key={fa.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{fa.founderName ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{fa.founderEmail ?? ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{fa.courseTitle ?? "—"}</p>
                          </TableCell>
                          <TableCell>
                            {fa.courseType && <TypeBadge type={fa.courseType} />}
                          </TableCell>
                          <TableCell>
                            {fa.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFounderAssignment.mutate(fa.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Progress Dashboard */}
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between cursor-pointer"
            onClick={() => setExpandedProgress(!expandedProgress)}
          >
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Cohort Progress Dashboard
            </CardTitle>
            {expandedProgress ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          {expandedProgress && (
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={selectedProgressCohort} onValueChange={setSelectedProgressCohort}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProgressCohort && progressData.length === 0 && (
                <p className="text-sm text-muted-foreground">No courses assigned to this cohort.</p>
              )}

              {progressData.length > 0 && (
                <div className="space-y-3">
                  {progressData.map((item) => (
                    <div key={item.courseId} className="rounded-md border p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.courseTitle}</p>
                          <TypeBadge type={item.courseType} />
                        </div>
                        <span className="text-lg font-bold text-primary">{item.completionPct}%</span>
                      </div>
                      <Progress value={item.completionPct} className="h-2 mb-2" />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {item.complete} complete
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          {item.inProgress} in progress
                        </span>
                        <span className="flex items-center gap-1">
                          <Circle className="h-3 w-3 text-gray-400" />
                          {item.notStarted} not started
                        </span>
                        <span className="flex items-center gap-1 ml-auto">
                          {item.totalFounders} enrolled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Create/Edit Course Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                className="mt-1"
                placeholder="e.g. Introduction to Product-Market Fit"
                value={courseForm.title}
                onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                className="mt-1"
                placeholder="What will participants learn?"
                value={courseForm.description}
                onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Select
                  value={courseForm.type}
                  onValueChange={(v) => setCourseForm((f) => ({ ...f, type: v as CourseType }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="live_session">Live Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  placeholder="e.g. 45"
                  value={courseForm.durationMins}
                  onChange={(e) => setCourseForm((f) => ({ ...f, durationMins: e.target.value }))}
                />
              </div>
            </div>

            {/* Resource: URL or File Upload */}
            <div>
              <label className="text-sm font-medium">Resource</label>
              <div className="flex gap-2 mt-1 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={fileMode === "url" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFileMode("url")}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" /> URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={fileMode === "file" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFileMode("file")}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> File Upload
                </Button>
              </div>
              {fileMode === "url" ? (
                <Input
                  placeholder="https://..."
                  value={courseForm.url}
                  onChange={(e) => setCourseForm((f) => ({ ...f, url: e.target.value }))}
                />
              ) : (
                <div
                  className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  {uploadFile ? (
                    <div>
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : editingCourse?.fileUrl ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Current file attached. Click to replace.</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload a file</p>
                      <p className="text-xs text-muted-foreground">PDF, PPTX, DOCX, MP4, etc.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCourseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCourseSubmit}
              disabled={!courseForm.title.trim() || isPending}
            >
              {uploading ? "Uploading..." : editingCourse ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Course to Cohort Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Course to Cohort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Cohort *</label>
              <Select value={assignCohortId} onValueChange={setAssignCohortId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select cohort..." />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Course *</label>
              <Select value={assignCourseId} onValueChange={setAssignCourseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .filter((c) => c.active)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title} ({TYPE_LABELS[c.type]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cohort-required"
                checked={assignRequired}
                onChange={(e) => setAssignRequired(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="cohort-required" className="text-sm font-medium cursor-pointer">
                Mark as required
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignCourse.mutate()}
              disabled={!assignCohortId || !assignCourseId || assignCourse.isPending}
            >
              Assign to Cohort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Course to Individual Founder Dialog */}
      <Dialog open={showFounderAssignDialog} onOpenChange={setShowFounderAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Course to Founder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2 px-1">
            Assign a course directly to an individual founder, outside of their cohort curriculum.
          </p>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Founder *</label>
              <Select value={assignFounderId} onValueChange={setAssignFounderId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select founder..." />
                </SelectTrigger>
                <SelectContent>
                  {founders.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name} {f.companyName ? `— ${f.companyName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Course *</label>
              <Select value={assignFounderCourseId} onValueChange={setAssignFounderCourseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .filter((c) => c.active)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title} ({TYPE_LABELS[c.type]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="founder-required"
                checked={assignFounderRequired}
                onChange={(e) => setAssignFounderRequired(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="founder-required" className="text-sm font-medium cursor-pointer">
                Mark as required
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFounderAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignCourseToFounder.mutate()}
              disabled={!assignFounderId || !assignFounderCourseId || assignCourseToFounder.isPending}
            >
              Assign to Founder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
