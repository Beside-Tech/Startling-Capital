import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth, getDefaultRoute } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sun, Moon, ArrowLeft, Eye, EyeOff, Lock, Mail, Star, ChevronDown, ChevronUp } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  pin: z.string().min(4, "PIN must be at least 4 characters"),
});

const TESTIMONIALS = [
  {
    quote: "The scoring feedback we received changed how we pitch. Every founder should go through this process.",
    name: "Kwame Asante",
    title: "CTO, PayBridge",
    program: "Growth Stream 2023",
    initials: "KA",
  },
  {
    quote: "Nobellum didn't just give us funding — they gave us a framework to think bigger and a community that actually shows up.",
    name: "Amara Osei",
    title: "CEO, AgriFlow",
    program: "GrowthWorks 2024",
    initials: "AO",
  },
  {
    quote: "The data room and investor connections opened doors we had been knocking on for two years. Game-changing.",
    name: "Temi Adeyemi",
    title: "Founder, HealthBridge",
    program: "WISE 2023",
    initials: "TA",
  },
  {
    quote: "I came in with an idea. I left with a product, a team, and my first paying customers. That's the Nobellum effect.",
    name: "Nadia Diallo",
    title: "CEO, EduReach",
    program: "GrowthWorks 2023",
    initials: "ND",
  },
  {
    quote: "The mentors here challenged me to be better. The curriculum pushed our startup from MVP to $200K ARR in one cohort.",
    name: "Marcus Thompson",
    title: "Co-Founder, LogiLink",
    program: "Growth Stream 2024",
    initials: "MT",
  },
];

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const t = TESTIMONIALS[current];

  return (
    <div className="relative">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: TESTIMONIALS.length }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setVisible(false);
              setTimeout(() => { setCurrent(i); setVisible(true); }, 300);
            }}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current ? "w-6 bg-white" : "w-2 bg-white/35"
            }`}
          />
        ))}
      </div>

      <div
        className="bg-white/10 rounded-2xl p-5 transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
      >
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-white/90 text-sm italic leading-relaxed mb-4">
          &ldquo;{t.quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {t.initials}
          </div>
          <div>
            <div className="text-white text-xs font-semibold">{t.name}</div>
            <div className="text-white/60 text-xs">{t.title} &mdash; {t.program}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const loginMutation = useLogin();
  const [showPin, setShowPin] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", pin: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.token, data.role, data.user, data.allowedAssignments);
        navigate(getDefaultRoute(data.role?.toLowerCase() ?? null));
      },
      onError: (error) => {
        toast({
          title: "Sign in failed",
          description: error.message || "Invalid email or PIN",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        <div className="relative flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">N</span>
          </div>
          <span className="font-display font-bold text-xl text-white">Nobellum</span>
        </div>

        <div className="relative">
          <h2 className="font-display font-bold text-4xl text-white mb-4 leading-tight">
            Welcome back<br />to your<br />launchpad.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-8">
            Your applications, data room, and advisory connections are waiting for you.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { value: "200+", label: "Founders" },
              { value: "$12M+", label: "Capital Raised" },
              { value: "94%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-xl text-white">{stat.value}</div>
                <div className="text-white/65 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <TestimonialCarousel />
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
          <div className="w-full max-w-sm">
            {/* Logo (mobile) */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                <span className="text-white font-bold text-sm font-display">N</span>
              </div>
              <span className="font-display font-bold text-lg text-foreground">Nobellum</span>
            </div>

            <div className="mb-8">
              <h1 className="font-display font-bold text-3xl text-foreground mb-2">Sign in</h1>
              <p className="text-muted-foreground text-sm">
                Enter your credentials to access your account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="you@example.com"
                            className="pl-9 bg-secondary/40 border-border focus:border-primary"
                            data-testid="input-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">PIN</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPin ? "text" : "password"}
                            placeholder="••••"
                            className="pl-9 pr-10 bg-secondary/40 border-border focus:border-primary tracking-widest"
                            data-testid="input-pin"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full gradient-teal text-white border-0 hover:opacity-90 py-5"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">
                  Apply as a founder
                </button>
              </p>
            </div>

            {/* Demo credentials */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-foreground/70">Demo Accounts</span>
                {showDemo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showDemo && (
                <div className="mt-2 border border-border/50 rounded-lg overflow-hidden text-xs">
                  {[
                    { role: "SuperAdmin",      email: "team@nobellum.com",    pin: "Nobellum2025!", color: "bg-violet-50 text-violet-700" },
                    { role: "Admin",           email: "admin@nobellum.com",   pin: "Admin1234",    color: "bg-blue-50 text-blue-700" },
                    { role: "ManagingPartner", email: "mp@nobellum.com",      pin: "Partner1234",  color: "bg-teal-50 text-teal-700" },
                    { role: "IC",              email: "ic@nobellum.com",      pin: "IC12341234",   color: "bg-emerald-50 text-emerald-700" },
                    { role: "Judge",           email: "judge@nobellum.com",   pin: "Judge1234",    color: "bg-amber-50 text-amber-700" },
                    { role: "Founder",         email: "founder@nobellum.com", pin: "Founder1234",  color: "bg-orange-50 text-orange-700" },
                    { role: "LP",              email: "lp@nobellum.com",      pin: "LP12341234",   color: "bg-pink-50 text-pink-700" },
                  ].map(({ role, email, pin, color }) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        form.setValue("email", email);
                        form.setValue("pin", pin);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-0 text-left"
                    >
                      <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] flex-shrink-0 ${color}`}>{role}</span>
                      <span className="text-muted-foreground truncate flex-1">{email}</span>
                      <span className="text-muted-foreground/60 font-mono flex-shrink-0">{pin}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
