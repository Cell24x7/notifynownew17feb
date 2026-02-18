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
import NotFound from "./pages/NotFound";


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

import UserPlans from "./pages/UserPlans";  

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
      <CustomThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Client App Routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chats" element={<Chats />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/reports" element={<Reports />} />

                <Route path="/automations" element={<Automations />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/user-plans" element={<UserPlans />} />
                <Route path="/settings" element={<Settings />} />
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


              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CustomThemeProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
