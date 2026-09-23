import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { GoogleCallbackPage } from './pages/auth/GoogleCallbackPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { AutomationsPage } from './pages/automations/AutomationsPage';
import { CampaignsPage } from './pages/campaigns/CampaignsPage';
import { AiTrainingPage } from './pages/ai/AiTrainingPage';
import { AiSandboxPage } from './pages/ai/AiSandboxPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SecuritySettingsPage } from './pages/settings/SecuritySettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SuperAdminPage } from './pages/superadmin/SuperAdminPage';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <NotificationProvider>
              <Routes>
                {/* Public Landing & Auth Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/signup" element={<RegisterPage />} />
                <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="automations" element={<AutomationsPage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="templates" element={<CampaignsPage />} />
                  <Route path="ai" element={<AiTrainingPage />} />
                  <Route path="ai/sandbox" element={<AiSandboxPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="security" element={<SecuritySettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Direct paths for profile & settings */}
                <Route path="/profile" element={<DashboardLayout />}>
                  <Route index element={<ProfilePage />} />
                </Route>
                <Route path="/settings" element={<DashboardLayout />}>
                  <Route index element={<SettingsPage />} />
                  <Route path="security" element={<SecuritySettingsPage />} />
                </Route>

                {/* Super Admin Platform Route */}
                <Route path="/super-admin" element={<DashboardLayout />}>
                  <Route index element={<SuperAdminPage />} />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </NotificationProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
