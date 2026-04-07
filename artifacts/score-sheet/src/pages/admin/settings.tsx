import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, BarChart3, FileText, RefreshCw, Eye, Globe } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Setting = {
  key: string;
  label: string;
  description?: string;
  value: string;
  type: string;
};

async function fetchSettings(token: string): Promise<Setting[]> {
  const res = await fetch(`${BASE}/api/admin/site-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function updateSetting(key: string, value: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/site-settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Failed to update setting");
}

function SettingField({
  setting,
  onChange,
  onSave,
  saving,
}: {
  setting: Setting;
  onChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
  saving: string | null;
}) {
  if (setting.type === "markdown") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{setting.label}</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(setting.key)}
            disabled={saving === setting.key}
            className="h-7 gap-1.5 text-xs"
          >
            {saving === setting.key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
        {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
        <textarea
          className="w-full min-h-[200px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          placeholder="Write content in Markdown..."
        />
        <p className="text-xs text-muted-foreground">Markdown supported: ## headings, **bold**, - lists</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{setting.label}</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSave(setting.key)}
          disabled={saving === setting.key}
          className="h-7 gap-1.5 text-xs"
        >
          {saving === setting.key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
      </div>
      {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
      <Input
        value={setting.value}
        onChange={(e) => onChange(setting.key, e.target.value)}
        placeholder={setting.label}
      />
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const rendered = content
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return (
    <div
      className="prose prose-sm max-w-none text-foreground bg-secondary/30 rounded-xl p-5 border border-border text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const token = localStorage.getItem("auth_token") ?? "";

  useEffect(() => {
    fetchSettings(token)
      .then(setSettings)
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return;
    setSaving(key);
    try {
      await updateSetting(key, setting.value, token);
      toast({ title: "Saved", description: `${setting.label} updated successfully.` });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const getSetting = (key: string) => settings.find(s => s.key === key);
  const statSettings = settings.filter(s => s.key.startsWith("stat_") || s.key === "hero_badge");
  const legalSettings = settings.filter(s => s.key.startsWith("legal_"));

  return (
    <ProtectedRoute adminOnly>
      <AppLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-display">Site Settings</h1>
            <p className="text-muted-foreground mt-1">
              Edit homepage metrics, badge text, and legal pages. Changes take effect immediately on the live site.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading settings...</div>
          ) : (
            <Tabs defaultValue="homepage">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="homepage" className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Homepage Stats & Badge
                </TabsTrigger>
                <TabsTrigger value="legal" className="gap-2">
                  <FileText className="h-4 w-4" /> Legal Pages
                </TabsTrigger>
              </TabsList>

              {/* Homepage Stats */}
              <TabsContent value="homepage">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Hero Badge
                      </CardTitle>
                      <CardDescription>Short badge shown at the top of the homepage hero section</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getSetting("hero_badge") && (
                        <SettingField
                          setting={getSetting("hero_badge")!}
                          onChange={handleChange}
                          onSave={handleSave}
                          saving={saving}
                        />
                      )}
                      {getSetting("hero_badge") && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1.5">Preview:</p>
                          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium">
                            📍 {getSetting("hero_badge")?.value}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Homepage Metrics
                      </CardTitle>
                      <CardDescription>
                        The three stats displayed on the landing page. Stat 2 shows the live founder count from the database — you can only edit its label.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs">Stat 1</Badge>
                          <span className="text-xs text-muted-foreground">Fully editable</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {getSetting("stat_1_value") && (
                            <SettingField setting={getSetting("stat_1_value")!} onChange={handleChange} onSave={handleSave} saving={saving} />
                          )}
                          {getSetting("stat_1_label") && (
                            <SettingField setting={getSetting("stat_1_label")!} onChange={handleChange} onSave={handleSave} saving={saving} />
                          )}
                        </div>
                      </div>

                      <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 text-xs">Stat 2</Badge>
                          <span className="text-xs text-muted-foreground">Value = live founder count from database</span>
                        </div>
                        {getSetting("stat_2_label") && (
                          <SettingField setting={getSetting("stat_2_label")!} onChange={handleChange} onSave={handleSave} saving={saving} />
                        )}
                      </div>

                      <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-xs">Stat 3</Badge>
                          <span className="text-xs text-muted-foreground">Fully editable</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {getSetting("stat_3_value") && (
                            <SettingField setting={getSetting("stat_3_value")!} onChange={handleChange} onSave={handleSave} saving={saving} />
                          )}
                          {getSetting("stat_3_label") && (
                            <SettingField setting={getSetting("stat_3_label")!} onChange={handleChange} onSave={handleSave} saving={saving} />
                          )}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="bg-secondary/40 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Homepage Stats Preview</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: getSetting("stat_1_value")?.value ?? "$20M+", label: getSetting("stat_1_label")?.value ?? "" },
                            { value: "Live", label: getSetting("stat_2_label")?.value ?? "Founders in community" },
                            { value: getSetting("stat_3_value")?.value ?? "100+", label: getSetting("stat_3_label")?.value ?? "" },
                          ].map((stat, i) => (
                            <div key={i} className="bg-card rounded-xl p-3 text-center border border-border">
                              <div className="font-bold text-lg text-foreground font-display">{stat.value}</div>
                              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Legal Pages */}
              <TabsContent value="legal">
                <div className="space-y-4">
                  {legalSettings.map(setting => (
                    <Card key={setting.key}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{setting.label}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-xs"
                              onClick={() => setPreviewKey(previewKey === setting.key ? null : setting.key)}
                            >
                              <Eye className="h-3 w-3" />
                              {previewKey === setting.key ? "Edit" : "Preview"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(setting.key)}
                              disabled={saving === setting.key}
                              className="h-7 gap-1.5 text-xs"
                            >
                              {saving === setting.key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              Save
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          {setting.description} — available at{" "}
                          <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                            /legal/{setting.key.replace("legal_", "")}
                          </code>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {previewKey === setting.key ? (
                          <MarkdownPreview content={setting.value} />
                        ) : (
                          <textarea
                            className="w-full min-h-[250px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            value={setting.value}
                            onChange={(e) => handleChange(setting.key, e.target.value)}
                            placeholder="Write content in Markdown..."
                          />
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Markdown supported: <code className="bg-secondary px-1 rounded">## heading</code>{" "}
                          <code className="bg-secondary px-1 rounded">**bold**</code>{" "}
                          <code className="bg-secondary px-1 rounded">- bullet</code>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
