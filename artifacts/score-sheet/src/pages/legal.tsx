import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, ArrowLeft, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LEGAL_PAGES = {
  privacy: { title: "Privacy Policy", key: "legal_privacy" },
  terms: { title: "Terms of Service", key: "legal_terms" },
  cookies: { title: "Cookie Policy", key: "legal_cookies" },
};

type LegalType = keyof typeof LEGAL_PAGES;

async function fetchSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/api/public/settings`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-3 text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-3 text-foreground">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>');
}

export default function Legal({ legalType }: { legalType: LegalType }) {
  const [, navigate] = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const page = LEGAL_PAGES[legalType];

  useEffect(() => {
    fetchSettings().then(setSettings).finally(() => setLoading(false));
  }, []);

  const content = settings[page.key] ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <div>
              <span className="font-display font-bold text-sm text-foreground leading-none">Nobellum</span>
              <div className="text-[9px] text-muted-foreground font-medium tracking-wide leading-none">PROGRAMS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <Button variant="ghost" size="sm" className="mb-8 gap-2 text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        {/* Legal page links */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {(Object.entries(LEGAL_PAGES) as [LegalType, { title: string; key: string }][]).map(([type, info]) => (
            <button
              key={type}
              onClick={() => navigate(`/legal/${type}`)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-all font-medium ${
                legalType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {info.title}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl text-foreground mb-2">{page.title}</h1>
          <p className="text-sm text-muted-foreground">
            Nobellum Programs · Toronto, Canada ·{" "}
            <a href="https://www.nobellum.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              nobellum.com <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : content ? (
          <div
            className="prose prose-neutral max-w-none text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: `<p class="mb-4">${renderMarkdown(content)}</p>`,
            }}
          />
        ) : (
          <div className="bg-secondary/30 rounded-2xl p-8 text-center text-muted-foreground">
            <p>This page is being updated. Please check back soon.</p>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nobellum. All rights reserved. Based in Toronto, Ontario, Canada.
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() { return <Legal legalType="privacy" />; }
export function TermsPage() { return <Legal legalType="terms" />; }
export function CookiesPage() { return <Legal legalType="cookies" />; }
