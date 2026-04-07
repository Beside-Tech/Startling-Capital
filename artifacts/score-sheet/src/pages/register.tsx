import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  CheckCircle2,
  User,
  Building2,
  Lock,
  Rocket,
  Sparkles,
  Globe,
  Briefcase,
  MapPin,
  Mail,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_COUNTRIES, getRegionsForCountry } from "@/lib/countries";

const STEPS = [
  { id: 1, title: "Welcome", subtitle: "Let's get you started" },
  { id: 2, title: "Personal Info", subtitle: "Tell us about yourself" },
  { id: 3, title: "Your Startup", subtitle: "About your company" },
  { id: 4, title: "Secure Access", subtitle: "Create your credentials" },
];

const WELCOME_QUOTES = [
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "Innovation is seeing what everybody has seen and thinking what nobody has thought.", author: "Dr. Albert Szent-György" },
  { quote: "The greatest risk is not taking one.", author: "Unknown" },
];

const SECTORS = [
  "FinTech", "HealthTech", "EdTech", "AgriTech", "ClimaTech", "E-commerce",
  "Logistics", "PropTech", "LegalTech", "InsurTech", "AI/ML", "SaaS",
  "Consumer Tech", "B2B", "Social Impact", "Other",
];

const STAGES = ["Idea", "MVP", "Pre-Revenue", "Early Revenue", "Growth", "Scale-up"];

function StepIndicator({ currentStep, total }: { currentStep: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`step-dot transition-all duration-500 ${
            i + 1 === currentStep ? "active" : i + 1 < currentStep ? "completed" : ""
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [, navigate] = useLocation();
  const quoteIndex = Math.floor(Math.random() * WELCOME_QUOTES.length);
  const quote = WELCOME_QUOTES[quoteIndex];

  return (
    <div className="animate-fade-in-up text-center">
      <div className="w-20 h-20 rounded-3xl gradient-teal flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
        <Sparkles className="h-10 w-10 text-white" />
      </div>

      <h1 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
        Welcome to{" "}
        <span className="text-gradient">Nobellum</span>
      </h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">
        You're about to join Africa's most ambitious founder community. It starts with one step.
      </p>

      <div className="bg-accent/40 border border-accent rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
        <p className="text-foreground/80 text-sm leading-relaxed italic mb-3">"{quote.quote}"</p>
        <p className="text-primary text-xs font-semibold">— {quote.author}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8 max-w-md mx-auto">
        {[
          { icon: Rocket, label: "Apply to programs" },
          { icon: Building2, label: "Build your data room" },
          { icon: Globe, label: "Access global network" },
        ].map((item) => (
          <div key={item.label} className="bg-secondary/60 rounded-xl p-3 text-center">
            <item.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="gradient-teal text-white border-0 hover:opacity-90 w-full max-w-sm gap-2 py-6 text-base"
        onClick={onNext}
      >
        Let's Begin <ArrowRight className="h-5 w-5" />
      </Button>

      <p className="text-muted-foreground text-sm mt-4">
        Already have an account?{" "}
        <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
          Sign in
        </button>
      </p>
    </div>
  );
}

function PersonalInfoStep({ data, onChange, onNext, onBack }: {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isValid = data.name && data.email;
  const regions = data.country ? getRegionsForCountry(data.country) : [];
  const [countryOpen, setCountryOpen] = useState(false);

  const handleCountryChange = (v: string) => {
    onChange("country", v);
    onChange("region", "");
    setCountryOpen(false);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">About You</h2>
          <p className="text-muted-foreground text-sm">We'd love to know who's behind the vision</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Amara Osei"
              value={data.name || ""}
              onChange={(e) => onChange("name", e.target.value)}
              className="bg-secondary/40 border-border focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@company.com"
                value={data.email || ""}
                onChange={(e) => onChange("email", e.target.value)}
                className="pl-9 bg-secondary/40 border-border focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Country</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between bg-secondary/40 border-border font-normal"
                >
                  {data.country || <span className="text-muted-foreground">Select country</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {ALL_COUNTRIES.map((c) => (
                        <CommandItem
                          key={c.name}
                          value={c.name}
                          onSelect={handleCountryChange}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", data.country === c.name ? "opacity-100" : "opacity-0")}
                          />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {regions.length > 0 ? "Province / State / Region" : "City"}
            </Label>
            {regions.length > 0 ? (
              <Select value={data.region || ""} onValueChange={(v) => onChange("region", v)}>
                <SelectTrigger className="bg-secondary/40 border-border">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Your city"
                  value={data.city || ""}
                  onChange={(e) => onChange("city", e.target.value)}
                  className="pl-9 bg-secondary/40 border-border focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* City field (shown when region is selected for countries with regions) */}
        {regions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">City</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Your city (optional)"
                value={data.city || ""}
                onChange={(e) => onChange("city", e.target.value)}
                className="pl-9 bg-secondary/40 border-border focus:border-primary transition-colors"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">LinkedIn Profile</Label>
          <Input
            placeholder="https://linkedin.com/in/yourname"
            value={data.linkedinUrl || ""}
            onChange={(e) => onChange("linkedinUrl", e.target.value)}
            className="bg-secondary/40 border-border focus:border-primary transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Brief Bio</Label>
          <Textarea
            placeholder="Tell us a bit about yourself — your background, expertise, and what drives you..."
            value={data.bio || ""}
            onChange={(e) => onChange("bio", e.target.value)}
            className="bg-secondary/40 border-border focus:border-primary transition-colors resize-none h-24"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          className="flex-2 gap-2 gradient-teal text-white border-0 hover:opacity-90"
          onClick={onNext}
          disabled={!isValid}
          style={{ flex: 2 }}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StartupInfoStep({ data, onChange, onNext, onBack }: {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Your Startup</h2>
          <p className="text-muted-foreground text-sm">Tell us about the company you're building</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Company Name</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Acme Technologies"
              value={data.companyName || ""}
              onChange={(e) => onChange("companyName", e.target.value)}
              className="pl-9 bg-secondary/40 border-border focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Sector / Industry</Label>
            <Select value={data.sector || ""} onValueChange={(v) => onChange("sector", v)}>
              <SelectTrigger className="bg-secondary/40 border-border">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Current Stage</Label>
            <Select value={data.stage || ""} onValueChange={(v) => onChange("stage", v)}>
              <SelectTrigger className="bg-secondary/40 border-border">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Website (optional)</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://yourcompany.com"
              value={data.companyWebsite || ""}
              onChange={(e) => onChange("companyWebsite", e.target.value)}
              className="pl-9 bg-secondary/40 border-border focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
          <p className="text-xs text-primary/80 leading-relaxed">
            <span className="font-semibold">No company yet?</span> That's perfectly fine! Many Nobellum founders are still building when they apply. What matters is your vision and your grit.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          className="gap-2 gradient-teal text-white border-0 hover:opacity-90"
          onClick={onNext}
          style={{ flex: 2 }}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SecureAccessStep({ data, onChange, onSubmit, onBack, isLoading }: {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isValid = data.pin && data.pin.length >= 4 && data.pin === data.pinConfirm;

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Secure Access</h2>
          <p className="text-muted-foreground text-sm">Create a PIN to access your account</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-accent/40 border border-accent rounded-xl p-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Your PIN is your password — keep it safe and memorable. Use 4–8 digits.
            Nobellum will never ask for your PIN over email or phone.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Create PIN <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPin ? "text" : "password"}
              placeholder="4–8 digits"
              value={data.pin || ""}
              maxLength={8}
              onChange={(e) => onChange("pin", e.target.value.replace(/\D/g, ""))}
              className="pl-9 pr-10 bg-secondary/40 border-border focus:border-primary tracking-widest text-lg"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Confirm PIN <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your PIN"
              value={data.pinConfirm || ""}
              maxLength={8}
              onChange={(e) => onChange("pinConfirm", e.target.value.replace(/\D/g, ""))}
              className={`pl-9 pr-10 bg-secondary/40 border-border focus:border-primary tracking-widest text-lg ${
                data.pinConfirm && data.pin !== data.pinConfirm ? "border-destructive" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {data.pinConfirm && data.pin !== data.pinConfirm && (
            <p className="text-xs text-destructive">PINs don't match</p>
          )}
          {data.pinConfirm && data.pin === data.pinConfirm && data.pin.length >= 4 && (
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> PINs match
            </p>
          )}
        </div>

        <div className="bg-secondary/60 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground mb-2">Account Summary</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground font-medium">{data.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-medium">{data.email}</span>
          </div>
          {data.country && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground font-medium">
                {[data.city, data.region, data.country].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          {data.companyName && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Company</span>
              <span className="text-foreground font-medium">{data.companyName}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2" disabled={isLoading}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          className="gap-2 gradient-teal text-white border-0 hover:opacity-90"
          onClick={onSubmit}
          disabled={!isValid || isLoading}
          style={{ flex: 2 }}
        >
          {isLoading ? (
            <>Creating account...</>
          ) : (
            <>
              <Rocket className="h-4 w-4" /> Create Account
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SuccessStep({ name }: { name: string }) {
  const [, navigate] = useLocation();

  return (
    <div className="animate-fade-in-up text-center">
      <div className="w-20 h-20 rounded-3xl bg-green-500/15 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>
      <h2 className="font-display font-bold text-3xl text-foreground mb-3">
        Welcome, {name.split(" ")[0]}! 🎉
      </h2>
      <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto leading-relaxed">
        Your Nobellum founder account is ready. Your journey to building something extraordinary starts right now.
      </p>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 text-left max-w-sm mx-auto space-y-3">
        {[
          "Explore active programs and apply",
          "Set up your investor data room",
          "Connect with the Nobellum community",
        ].map((item, i) => (
          <div key={item} className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </div>
            <span className="text-foreground">{item}</span>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="gradient-teal text-white border-0 hover:opacity-90 gap-2 px-8"
        onClick={() => navigate("/founder/dashboard")}
      >
        Go to My Dashboard <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Register() {
  const [, navigate] = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const onChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          pin: formData.pin,
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          sector: formData.sector,
          stage: formData.stage,
          country: formData.country,
          region: formData.region,
          city: formData.city,
          bio: formData.bio,
          linkedinUrl: formData.linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_role", "founder");
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">N</span>
          </div>
          <span className="font-display font-bold text-xl text-white">Nobellum</span>
        </div>

        <div className="relative">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-6 animate-float">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h2 className="font-display font-bold text-4xl text-white mb-4 leading-tight">
              Your startup<br />deserves a<br />running start.
            </h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Join 200+ founders who've accessed funding, mentorship, and global connections through Nobellum.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "200+", label: "Founders" },
              { value: "$12M+", label: "Raised" },
              { value: "94%", label: "Success" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-2xl text-white">{stat.value}</div>
                <div className="text-white/65 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/85 text-sm italic leading-relaxed mb-2">
              "Nobellum didn't just give us funding — they gave us a framework to think bigger."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">AO</div>
              <div>
                <div className="text-white text-xs font-semibold">Amara Osei</div>
                <div className="text-white/60 text-xs">CEO, AgriFlow — GrowthWorks 2024</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
          <div className="w-full max-w-md">
            {!success && (
              <div className="text-center mb-6">
                <div className="text-xs text-muted-foreground mb-3">
                  Step {step} of {STEPS.length}
                </div>
                <StepIndicator currentStep={step} total={STEPS.length} />
              </div>
            )}

            {success ? (
              <SuccessStep name={formData.name || "Founder"} />
            ) : step === 1 ? (
              <WelcomeStep onNext={() => setStep(2)} />
            ) : step === 2 ? (
              <PersonalInfoStep data={formData} onChange={onChange} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            ) : step === 3 ? (
              <StartupInfoStep data={formData} onChange={onChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />
            ) : (
              <SecureAccessStep data={formData} onChange={onChange} onSubmit={handleSubmit} onBack={() => setStep(3)} isLoading={isLoading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
