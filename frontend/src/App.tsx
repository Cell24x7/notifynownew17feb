import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { RoleProvider } from '@/contexts/RoleContext';
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Chats from "./pages/Chats";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Automations from "./pages/Automations";
import Integrations from "./pages/Integrations";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import Templates from "./pages/Templates";
import Chatflows from "./pages/Chatflows";
import LinkedInCallback from "./pages/LinkedInCallback";


// Super Admin Pages
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminChats from "./pages/super-admin/Chats";
import SuperAdminCampaigns from "./pages/super-admin/Campaigns";
import SuperAdminClients from "./pages/super-admin/Clients";
import SuperAdminPlans from "./pages/super-admin/Plans";
import SuperAdminRoles from "./pages/super-admin/Roles";
import SuperAdminResellers from "./pages/super-admin/Resellers";
import SuperAdminAffiliates from "./pages/super-admin/Affiliates";
import SuperAdminWallet from "./pages/super-admin/Wallet";
import SuperAdminLogs from "./pages/super-admin/Logs";
import SuperAdminReports from "./pages/super-admin/Reports";
import SuperAdminVendors from "./pages/super-admin/Vendors";
import SuperAdminNumbers from "./pages/super-admin/Numbers";
import SuperAdminRcsConfigs from "./pages/super-admin/RcsConfigs";
import SuperAdminWhatsappConfigs from "./pages/super-admin/WhatsappConfigs";
import SuperAdminSmsGateways from "./pages/super-admin/SmsGateways";
import SuperAdminUsageLedger from "./pages/super-admin/UsageLedger";
import SuperAdminSystemEngine from "./pages/super-admin/SystemEngine";
import SuperAdminDevelopmentReport from "./pages/super-admin/DevelopmentReport";
import ResellerBranding from "./pages/reseller/Branding";
import ResellerUsers from "./pages/reseller/Users";

import UserPlans from "./pages/UserPlans";
import Marketplace from "./pages/Marketplace";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DLTTemplates from "./pages/DLTTemplates";

const queryClient = new QueryClient();

import { BrandingProvider } from "@/contexts/BrandingContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandingProvider>
        <RoleProvider>
          <CustomThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* Client App Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/chats" element={<Chats />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/dlt-templates" element={<DLTTemplates />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/reports" element={<Reports />} />

                    <Route path="/automations" element={<Automations />} />
                    <Route path="/chatflows" element={<Chatflows />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/user-plans" element={<UserPlans />} />
                    <Route path="/settings" element={<Settings />} />

                    {/* Reseller Specific Routes */}
                    <Route path="/reseller/branding" element={<ResellerBranding />} />
                    <Route path="/reseller/users" element={<ResellerUsers />} />
                  </Route>

                  {/* Super Admin Routes */}
                  <Route element={<SuperAdminLayout />}>
                    <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/chats" element={<SuperAdminChats />} />
                    <Route path="/super-admin/campaigns" element={<SuperAdminCampaigns />} />
                    <Route path="/super-admin/clients" element={<SuperAdminClients />} />
                    <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
                    <Route path="/super-admin/roles" element={<SuperAdminRoles />} />
                    <Route path="/super-admin/resellers" element={<SuperAdminResellers />} />
                    <Route path="/super-admin/affiliates" element={<SuperAdminAffiliates />} />
                    <Route path="/super-admin/wallet" element={<SuperAdminWallet />} />
                    <Route path="/super-admin/logs" element={<SuperAdminLogs />} />
                    <Route path="/super-admin/reports" element={<SuperAdminReports />} />
                    <Route path="/super-admin/vendors" element={<SuperAdminVendors />} />
                    <Route path="/super-admin/numbers" element={<SuperAdminNumbers />} />
                    <Route path="/super-admin/rcs-configs" element={<SuperAdminRcsConfigs />} />
                    <Route path="/super-admin/whatsapp-configs" element={<SuperAdminWhatsappConfigs />} />
                    <Route path="/super-admin/sms-gateways" element={<SuperAdminSmsGateways />} />
                    <Route path="/super-admin/ledger" element={<SuperAdminUsageLedger />} />
                    <Route path="/super-admin/engine" element={<SuperAdminSystemEngine />} />
                    <Route path="/super-admin/dev-progress" element={<SuperAdminDevelopmentReport />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CustomThemeProvider>
        </RoleProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider >
);

export default App;
