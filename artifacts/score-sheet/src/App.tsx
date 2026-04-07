import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Score from "@/pages/score";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminAdvance from "@/pages/admin/advance";
import AdminExport from "@/pages/admin/export";
import AdminManage from "@/pages/admin/manage";
import AdminSettings from "@/pages/admin/settings";
import AdminFounders from "@/pages/admin/founders";
import AdminTestimonials from "@/pages/admin/testimonials";
import AdminCurriculum from "@/pages/admin/curriculum";
import AdminTraction from "@/pages/admin/traction";
import AdminVentures from "@/pages/admin/ventures/index";
import AdminVenturesDetail from "@/pages/admin/ventures/detail";
import AdminUsers from "@/pages/admin/users";
import AdminCapTable from "@/pages/admin/cap-table";

import FounderDashboard from "@/pages/founder/dashboard";
import FounderApply from "@/pages/founder/apply";
import FounderCourses from "@/pages/founder/courses";
import FounderTraction from "@/pages/founder/traction";
import FounderApplications from "@/pages/founder/applications";
import FounderDataRoom from "@/pages/founder/data-room";
import FounderQA from "@/pages/founder/qa";
import FounderAdvisory from "@/pages/founder/advisory";
import FounderProfile from "@/pages/founder/profile";

import ICDashboard from "@/pages/ic/dashboard";
import ICDeals from "@/pages/ic/deals";
import ICPortfolio from "@/pages/ic/portfolio";
import ICPackets from "@/pages/ic/packets";

import LPDashboard from "@/pages/lp/dashboard";
import LPPortfolio from "@/pages/lp/portfolio";
import LPFounders from "@/pages/lp/founders";
import LPDataRoom from "@/pages/lp/data-room";
import LPCapitalCalls from "@/pages/lp/capital-calls";

import MPDashboard from "@/pages/mp/dashboard";
import MPInvestments from "@/pages/mp/investments";
import MPLPs from "@/pages/mp/lps";
import MPDealFlow from "@/pages/mp/deal-flow";
import MPAdvisory from "@/pages/mp/advisory";
import MPCapitalCalls from "@/pages/mp/capital-calls";
import MPFundMetrics from "@/pages/mp/fund-metrics";
import MPICMeetings from "@/pages/mp/ic-meetings";
import MPTermSheet from "@/pages/mp/term-sheet";
import MPFunds from "@/pages/mp/funds";
import MPFounderAsks from "@/pages/mp/founder-asks";
import MPLPPortal from "@/pages/mp/lp-portal";
import MPDiligenceDetail from "@/pages/mp/diligence-detail";
import MPICMeetingDetail from "@/pages/mp/ic-meeting-detail";
import MPPortfolioDetail from "@/pages/mp/portfolio-detail";
import MPFundCapitalCalls from "@/pages/mp/fund-capital-calls";
import ICMeetings from "@/pages/ic/meetings";
import FounderAsks from "@/pages/founder/asks";
import LPPortal from "@/pages/lp/portal";

import { PrivacyPage, TermsPage, CookiesPage } from "@/pages/legal";

const queryClient = new QueryClient();

function RootRedirect() {
  const [, navigate] = useLocation();
  const role = localStorage.getItem("auth_role");
  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    if (!token) return;
    if (role === "admin" || role === "superadmin") navigate("/admin/dashboard");
    else if (role === "judge") navigate("/score");
    else if (role === "founder") navigate("/founder/dashboard");
    else if (role === "ic") navigate("/ic/dashboard");
    else if (role === "managingpartner") navigate("/mp/dashboard");
    else if (role === "ventureassociate") navigate("/mp/deal-flow");
    else if (role === "lp") navigate("/lp/dashboard");
  }, []);

  if (!token) return <Landing />;

  if (role === "admin" || role === "superadmin") return <AdminDashboard />;
  if (role === "judge") return <Score />;
  if (role === "founder") return <FounderDashboard />;
  if (role === "ic") return <ICDashboard />;
  if (role === "managingpartner") return <MPDashboard />;
  if (role === "ventureassociate") return <MPDealFlow />;
  if (role === "lp") return <LPDashboard />;
  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/score" component={Score} />

      {/* Admin */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/advance" component={AdminAdvance} />
      <Route path="/admin/export" component={AdminExport} />
      <Route path="/admin/manage" component={AdminManage} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/founders" component={AdminFounders} />
      <Route path="/admin/testimonials" component={AdminTestimonials} />
      <Route path="/admin/curriculum" component={AdminCurriculum} />
      <Route path="/admin/traction" component={AdminTraction} />
      <Route path="/admin/ventures/:id" component={AdminVenturesDetail} />
      <Route path="/admin/ventures" component={AdminVentures} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/cap-table" component={AdminCapTable} />

      {/* Founder */}
      <Route path="/founder/dashboard" component={FounderDashboard} />
      <Route path="/founder/apply" component={FounderApply} />
      <Route path="/founder/courses" component={FounderCourses} />
      <Route path="/founder/traction" component={FounderTraction} />
      <Route path="/founder/applications" component={FounderApplications} />
      <Route path="/founder/data-room" component={FounderDataRoom} />
      <Route path="/founder/qa" component={FounderQA} />
      <Route path="/founder/advisory" component={FounderAdvisory} />
      <Route path="/founder/profile" component={FounderProfile} />
      <Route path="/founder/asks" component={FounderAsks} />

      {/* Investment Committee */}
      <Route path="/ic/dashboard" component={ICDashboard} />
      <Route path="/ic/deals" component={ICDeals} />
      <Route path="/ic/portfolio" component={ICPortfolio} />
      <Route path="/ic/packets" component={ICPackets} />
      <Route path="/ic/meetings" component={ICMeetings} />

      {/* LP */}
      <Route path="/lp/dashboard" component={LPDashboard} />
      <Route path="/lp/portfolio" component={LPPortfolio} />
      <Route path="/lp/founders" component={LPFounders} />
      <Route path="/lp/data-room/:founderId" component={LPDataRoom} />
      <Route path="/lp/capital-calls" component={LPCapitalCalls} />
      <Route path="/lp/portal" component={LPPortal} />

      {/* Managing Partner */}
      <Route path="/mp/dashboard" component={MPDashboard} />
      <Route path="/mp/investments" component={MPInvestments} />
      <Route path="/mp/lps" component={MPLPs} />
      <Route path="/mp/deal-flow" component={MPDealFlow} />
      <Route path="/mp/advisory" component={MPAdvisory} />
      <Route path="/mp/capital-calls" component={MPCapitalCalls} />
      <Route path="/mp/fund-metrics" component={MPFundMetrics} />
      <Route path="/mp/ic-meetings" component={MPICMeetings} />
      <Route path="/mp/term-sheet" component={MPTermSheet} />
      <Route path="/mp/funds" component={MPFunds} />
      <Route path="/mp/founder-asks" component={MPFounderAsks} />
      <Route path="/mp/lp-portal" component={MPLPPortal} />
      <Route path="/mp/diligence/:id" component={MPDiligenceDetail} />
      <Route path="/mp/ic-meetings/:id" component={MPICMeetingDetail} />
      <Route path="/mp/portfolio/:dealId" component={MPPortfolioDetail} />
      <Route path="/mp/funds/:fundId/capital-calls" component={MPFundCapitalCalls} />

      {/* Legal */}
      <Route path="/legal/privacy" component={PrivacyPage} />
      <Route path="/legal/terms" component={TermsPage} />
      <Route path="/legal/cookies" component={CookiesPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  setAuthTokenGetter(() => localStorage.getItem("auth_token"));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
