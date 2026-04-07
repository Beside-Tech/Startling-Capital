import { useEffect, useState, useRef } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Upload, FileText, BarChart2, Image, FolderOpen, Scale,
  Trash2, Download, Plus, X, Loader2, CheckCircle2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("auth_token") ?? "";

const CATEGORIES = [
  { value: "pitch_deck",       label: "Pitch Deck",          icon: Image      },
  { value: "financial_model",  label: "Financial Model",     icon: BarChart2  },
  { value: "legal",            label: "Legal",               icon: Scale      },
  { value: "product",          label: "Product",             icon: FolderOpen },
  { value: "team",             label: "Team",                icon: FileText   },
  { value: "market_research",  label: "Market Research",     icon: FileText   },
  { value: "other",            label: "Other",               icon: FileText   },
] as const;

type Category = typeof CATEGORIES[number]["value"];

type DRFile = {
  id: number;
  originalName: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  category: Category;
  description: string | null;
  storageKey: string;
  uploadedAt: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function catLabel(val: string) {
  return CATEGORIES.find(c => c.value === val)?.label ?? val;
}

function catColor(cat: string) {
  const map: Record<string, string> = {
    pitch_deck: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
    financial_model: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50",
    legal: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
    product: "bg-violet-100 text-violet-800 border-violet-200",
    team: "bg-pink-100 text-pink-800 border-pink-200",
    market_research: "bg-cyan-100 text-cyan-800 border-cyan-200",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600",
  };
  return map[cat] ?? map.other;
}

export default function DataRoomPage() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <DataRoomInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function DataRoomInner() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<DRFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category>("other");
  const [description, setDescription] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const fetchFiles = async () => {
    const res = await fetch(`${BASE}/api/founder/data-room`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);

    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      setUploadProgress(30);

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");
      setUploadProgress(75);

      const regRes = await fetch(`${BASE}/api/founder/data-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          originalName: file.name,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          storageKey: objectPath,
          category: selectedCategory,
          description: description || null,
        }),
      });
      if (!regRes.ok) throw new Error("Failed to register file");
      setUploadProgress(100);

      await fetchFiles();
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ title: err?.message ?? "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`${BASE}/api/founder/data-room/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      setFiles(f => f.filter(x => x.id !== id));
      toast({ title: "File deleted" });
    } else {
      toast({ title: "Failed to delete file", variant: "destructive" });
    }
  };

  const filtered = filterCat === "all" ? files : files.filter(f => f.category === filterCat);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Data Room
          </h1>
          <p className="text-muted-foreground mt-1">Organize and share your investor-ready documents securely.</p>
        </div>
        <Button
          className="gradient-teal text-white border-0 hover:opacity-90 gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? `Uploading ${uploadProgress}%` : "Upload File"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* Upload options */}
      <Card className="border-dashed border-2">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category for next upload</label>
              <select
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as Category)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (optional)</label>
              <input
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-background"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          onClick={() => setFilterCat("all")}
        >
          All ({files.length})
        </button>
        {CATEGORIES.map(c => {
          const cnt = files.filter(f => f.category === c.value).length;
          if (!cnt) return null;
          return (
            <button
              key={c.value}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
              onClick={() => setFilterCat(c.value)}
            >
              {c.label} ({cnt})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No files yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your first document to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(file => (
            <Card key={file.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{file.originalName}</p>
                    <Badge className={`text-xs border ${catColor(file.category)}`}>{catLabel(file.category)}</Badge>
                  </div>
                  {file.description && <p className="text-xs text-muted-foreground mt-0.5">{file.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(file.fileSize)} · {new Date(file.uploadedAt).toLocaleDateString("en-CA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`${BASE}/api/storage${file.storageKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => handleDelete(file.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
