import { useEffect, useState } from "react";
import { FounderLayout } from "@/components/founder-layout";
import { ProtectedRoute } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Building2, Globe, MapPin, Linkedin, Edit3, Save, X,
  CheckCircle2, Calendar,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FounderProfile = {
  id: number;
  name: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  createdAt: string;
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long" });
}

export default function FounderProfilePage() {
  return (
    <ProtectedRoute founderOnly>
      <FounderLayout>
        <ProfileInner />
      </FounderLayout>
    </ProtectedRoute>
  );
}

function ProfileInner() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<FounderProfile>>({});

  const token = () => localStorage.getItem("auth_token") ?? "";

  useEffect(() => {
    fetch(`${BASE}/api/founder/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data) { setProfile(data); setForm(data); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/founder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          companyName: form.companyName,
          companyWebsite: form.companyWebsite,
          sector: form.sector,
          stage: form.stage,
          country: form.country,
          region: form.region,
          city: form.city,
          bio: form.bio,
          linkedinUrl: form.linkedinUrl,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setProfile({ ...profile!, ...form } as FounderProfile);
      setEditing(false);
      toast({ title: "Profile updated successfully" });
    } catch {
      toast({ title: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof FounderProfile) => (form[key] as string) ?? "";
  const set = (key: keyof FounderProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Profile not found. Please complete onboarding first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">Your founder profile and company information.</p>
        </div>
        {!editing ? (
          <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditing(false); setForm(profile); }}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              className="gap-2 gradient-teal text-white border-0 hover:opacity-90"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar + Identity */}
      <Card>
        <CardContent className="flex items-start gap-5 py-6">
          <div className="w-16 h-16 rounded-2xl gradient-teal flex items-center justify-center text-white font-bold text-xl shrink-0">
            {initials(profile.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              {profile.onboardingComplete && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50 border text-xs dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50 gap-1 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50">
                  <CheckCircle2 className="h-3 w-3" /> Onboarded
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Member since {formatDate(profile.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</label>
              {editing ? (
                <Input className="mt-1" value={field("companyName")} onChange={set("companyName")} placeholder="Your startup name" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.companyName ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</label>
              {editing ? (
                <Input className="mt-1" value={field("companyWebsite")} onChange={set("companyWebsite")} placeholder="https://yourcompany.com" />
              ) : (
                <p className="mt-1 text-sm">
                  {profile.companyWebsite
                    ? <a href={profile.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <Globe className="h-3 w-3" />{profile.companyWebsite}
                      </a>
                    : <span className="text-foreground">—</span>}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sector</label>
              {editing ? (
                <Input className="mt-1" value={field("sector")} onChange={set("sector")} placeholder="e.g. FinTech, HealthTech" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.sector ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</label>
              {editing ? (
                <Input className="mt-1" value={field("stage")} onChange={set("stage")} placeholder="e.g. Pre-seed, Seed, Series A" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.stage ?? "—"}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</label>
            {editing ? (
              <Textarea
                className="mt-1 min-h-[100px]"
                value={field("bio")}
                onChange={set("bio")}
                placeholder="Tell us about your company and mission..."
              />
            ) : (
              <p className="mt-1 text-sm text-foreground leading-relaxed">{profile.bio ?? "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location & Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location &amp; Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</label>
              {editing ? (
                <Input className="mt-1" value={field("country")} onChange={set("country")} placeholder="e.g. Canada" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.country ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Province / Region</label>
              {editing ? (
                <Input className="mt-1" value={field("region")} onChange={set("region")} placeholder="e.g. Ontario" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.region ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
              {editing ? (
                <Input className="mt-1" value={field("city")} onChange={set("city")} placeholder="e.g. Toronto" />
              ) : (
                <p className="mt-1 text-sm text-foreground font-medium">{profile.city ?? "—"}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LinkedIn URL</label>
            {editing ? (
              <Input className="mt-1" value={field("linkedinUrl")} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/yourname" />
            ) : (
              <p className="mt-1 text-sm">
                {profile.linkedinUrl
                  ? <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <Linkedin className="h-3 w-3" />{profile.linkedinUrl}
                    </a>
                  : <span className="text-foreground">—</span>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
