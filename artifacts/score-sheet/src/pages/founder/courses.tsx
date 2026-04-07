import { useState } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Video,
  Users,
  Radio,
  CheckCircle2,
  Clock,
  Circle,
  ExternalLink,
  StickyNote,
  GraduationCap,
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
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

type CourseType = "video" | "workshop" | "reading" | "live_session";
type ProgressStatus = "not_started" | "in_progress" | "complete";

interface FounderCourse {
  assignmentId: number;
  programId: string;
  cohortId: string;
  courseId: number;
  displayOrder: number;
  required: boolean;
  courseTitle: string;
  courseDescription: string | null;
  courseType: CourseType;
  courseDurationMins: number | null;
  courseUrl: string | null;
  courseFileUrl: string | null;
  status: ProgressStatus;
  notes: string | null;
  completedAt: string | null;
  progressId: number | null;
}

const TYPE_ICON: Record<CourseType, React.ElementType> = {
  video: Video,
  workshop: Users,
  reading: BookOpen,
  live_session: Radio,
};

const TYPE_LABEL: Record<CourseType, string> = {
  video: "Video",
  workshop: "Workshop",
  reading: "Reading",
  live_session: "Live Session",
};

const TYPE_COLOR: Record<CourseType, string> = {
  video: "bg-blue-100 text-blue-700",
  workshop: "bg-purple-100 text-purple-700",
  reading: "bg-amber-100 text-amber-700",
  live_session: "bg-green-100 text-green-700",
};

const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-background border",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200 border",
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200 border",
  },
};

export default function FounderCourses() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [notesDialog, setNotesDialog] = useState<FounderCourse | null>(null);
  const [notes, setNotes] = useState("");

  const { data: courses = [], isLoading } = useQuery<FounderCourse[]>({
    queryKey: ["founder-courses"],
    queryFn: () => apiFetch("/api/founder/courses"),
  });

  const updateProgress = useMutation({
    mutationFn: ({
      courseId,
      status,
      notes,
    }: {
      courseId: number;
      status: ProgressStatus;
      notes?: string;
    }) =>
      apiFetch(`/api/founder/courses/${courseId}/progress`, {
        method: "PUT",
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["founder-courses"] });
      toast({ title: "Progress updated" });
      setNotesDialog(null);
    },
    onError: () => toast({ title: "Failed to update progress", variant: "destructive" }),
  });

  function handleStatusToggle(course: FounderCourse) {
    let nextStatus: ProgressStatus;
    if (course.status === "not_started") nextStatus = "in_progress";
    else if (course.status === "in_progress") nextStatus = "complete";
    else nextStatus = "not_started";
    updateProgress.mutate({
      courseId: course.courseId,
      status: nextStatus,
      notes: course.notes ?? undefined,
    });
  }

  function openNotes(course: FounderCourse) {
    setNotesDialog(course);
    setNotes(course.notes ?? "");
  }

  const completedCount = courses.filter((c) => c.status === "complete").length;
  const inProgressCount = courses.filter((c) => c.status === "in_progress").length;

  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Your assigned curriculum — track your learning progress here.
          </p>
        </div>

        {/* Summary stats */}
        {courses.length > 0 && (
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-semibold">{completedCount}</span>
              <span className="text-muted-foreground">complete</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="font-semibold">{inProgressCount}</span>
              <span className="text-muted-foreground">in progress</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                {courses.length - completedCount - inProgressCount}
              </span>
              <span className="text-muted-foreground">not started</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <p>Loading your courses...</p>
          </div>
        )}

        {!isLoading && courses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No courses assigned yet</p>
            <p className="text-sm mt-1">
              Courses will appear here once you have been enrolled in a cohort.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {courses.map((course) => {
            const TypeIcon = TYPE_ICON[course.courseType];
            const statusCfg = STATUS_CONFIG[course.status];
            const StatusIcon = statusCfg.icon;

            return (
              <Card key={course.courseId} className={`transition-all ${statusCfg.bg}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[course.courseType]}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {TYPE_LABEL[course.courseType]}
                        </span>
                        {course.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {course.courseDurationMins && (
                          <span className="text-xs text-muted-foreground">
                            {course.courseDurationMins} min
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground">{course.courseTitle}</h3>
                      {course.courseDescription && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {course.courseDescription}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 shrink-0 text-xs font-medium ${statusCfg.color}`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{statusCfg.label}</span>
                    </div>
                  </div>

                  {course.notes && (
                    <div className="mt-3 p-2 bg-background/60 rounded text-xs text-muted-foreground border border-border/50">
                      <span className="font-medium">Notes: </span>
                      {course.notes}
                    </div>
                  )}

                  {course.completedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Completed {new Date(course.completedAt).toLocaleDateString()}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {course.courseUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={course.courseUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open Resource
                        </a>
                      </Button>
                    )}
                    {!course.courseUrl && course.courseFileUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`${BASE}${course.courseFileUrl}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Download File
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={course.status === "complete" ? "secondary" : "default"}
                      onClick={() => handleStatusToggle(course)}
                      disabled={updateProgress.isPending}
                    >
                      {course.status === "not_started" && (
                        <>
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Start
                        </>
                      )}
                      {course.status === "in_progress" && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Mark Complete
                        </>
                      )}
                      {course.status === "complete" && (
                        <>
                          <Circle className="h-3.5 w-3.5 mr-1" />
                          Reset
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openNotes(course)}>
                      <StickyNote className="h-3.5 w-3.5 mr-1" />
                      {course.notes ? "Edit Notes" : "Add Notes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notes — {notesDialog?.courseTitle}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Jot down key takeaways, questions, or action items..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateProgress.mutate({
                  courseId: notesDialog!.courseId,
                  status: notesDialog!.status,
                  notes,
                })
              }
              disabled={updateProgress.isPending}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </FounderLayout>
    </ProtectedRoute>
  );
}
