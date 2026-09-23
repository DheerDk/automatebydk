import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { User, Organization, UserSession, LoginHistoryItem } from '../types';

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  register: (data: {
    email: string;
    password?: string;
    name?: string;
    ownerName?: string;
    phone?: string;
    businessName?: string;
    businessCategory?: string;
    planTier?: string;
    billingCycle?: string;
    [key: string]: any;
  }) => Promise<any>;
  loginWithGoogle: (data: { code?: string; idToken?: string; redirectUri?: string }) => Promise<void>;
  getGoogleAuthUrl: () => Promise<{ isConfigured: boolean; url?: string; message?: string }>;
  sendOtp: (data: { phone: string; purpose?: string }) => Promise<any>;
  verifyOtp: (data: { phone: string; otp: string; purpose?: string }) => Promise<void>;
  verifyEmail: (token: string) => Promise<any>;
  resendVerificationEmail: (email?: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (data: { token: string; newPassword: string }) => Promise<any>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<any>;
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) => Promise<any>;
  fetchSessions: () => Promise<UserSession[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  logoutOtherDevices: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  fetchLoginHistory: () => Promise<LoginHistoryItem[]>;
  deleteAccount: (passwordConfirmation?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res: any = await api.get('/auth/me');
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        setOrganizations(res.data.organizations || []);

        const savedOrgId = localStorage.getItem('chatflow_org_id');
        const selectedOrg =
          res.data.organizations?.find((o: Organization) => o.id === savedOrgId) ||
          res.data.currentOrganization ||
          res.data.organizations?.[0] ||
          null;

        if (selectedOrg) {
          setCurrentOrganization(selectedOrg);
          localStorage.setItem('chatflow_org_id', selectedOrg.id);
          const token = localStorage.getItem('chatflow_token');
          if (token) {
            socketService.connect(token);
            socketService.joinOrg(selectedOrg.id);
          }
        }
      } else {
        setUser(null);
        setCurrentOrganization(null);
      }
    } catch {
      localStorage.removeItem('chatflow_token');
      localStorage.removeItem('chatflow_refresh_token');
      localStorage.removeItem('chatflow_org_id');
      setUser(null);
      setCurrentOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleAuthSuccess = (resData: any) => {
    if (resData.accessToken) {
      localStorage.setItem('chatflow_token', resData.accessToken);
    }
    if (resData.refreshToken) {
      localStorage.setItem('chatflow_refresh_token', resData.refreshToken);
    }
    if (resData.sessionToken) {
      localStorage.setItem('chatflow_session_token', resData.sessionToken);
    }

    if (resData.user) {
      setUser(resData.user);
    }
    if (resData.organizations) {
      setOrganizations(resData.organizations);
    }

    const initialOrg = resData.currentOrganization || resData.organizations?.[0] || resData.organization || null;
    if (initialOrg) {
      setCurrentOrganization(initialOrg);
      localStorage.setItem('chatflow_org_id', initialOrg.id);
      if (resData.accessToken) {
        socketService.connect(resData.accessToken);
        socketService.joinOrg(initialOrg.id);
      }
    }
  };

  const login = async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    const res: any = await api.post('/auth/login', credentials);
    if (res?.data) {
      handleAuthSuccess(res.data);
    }
  };

  const register = async (data: any) => {
    const res: any = await api.post('/auth/register', data);
    if (res?.data) {
      handleAuthSuccess({
        user: res.data.user,
        organization: res.data.organization,
        organizations: [res.data.organization],
        currentOrganization: res.data.organization,
        accessToken: res.data.session?.accessToken,
        refreshToken: res.data.session?.refreshToken,
        sessionToken: res.data.session?.sessionToken,
      });
    }
    return res?.data;
  };

  const getGoogleAuthUrl = async () => {
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : undefined;
    const res: any = await api.get('/auth/google/url', { params: { redirectUri } });
    return res || { isConfigured: false };
  };

  const loginWithGoogle = async (data: { code?: string; idToken?: string; redirectUri?: string }) => {
    const res: any = await api.post('/auth/google', data);
    if (res?.data) {
      handleAuthSuccess(res.data);
    }
  };

  const sendOtp = async (data: { phone: string; purpose?: string }) => {
    const res: any = await api.post('/auth/otp/request', data);
    return res?.data || res;
  };

  const verifyOtp = async (data: { phone: string; otp: string; purpose?: string }) => {
    const res: any = await api.post('/auth/otp/verify', data);
    if (res?.data) {
      handleAuthSuccess(res.data);
    }
  };

  const verifyEmail = async (token: string) => {
    const res: any = await api.post('/auth/email/verify', { token });
    if (user) {
      setUser({ ...user, isEmailVerified: true, isVerified: true });
    }
    return res;
  };

  const resendVerificationEmail = async (email?: string) => {
    const res: any = await api.post('/auth/email/resend-verification', { email: email || user?.email });
    return res;
  };

  const forgotPassword = async (email: string) => {
    const res: any = await api.post('/auth/password/forgot', { email });
    return res;
  };

  const resetPassword = async (data: { token: string; newPassword: string }) => {
    const res: any = await api.post('/auth/password/reset', data);
    return res;
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    const res: any = await api.post('/auth/password/change', data);
    return res;
  };

  const updateProfile = async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
    const res: any = await api.patch('/auth/profile', data);
    if (res?.data?.user && user) {
      setUser({ ...user, ...res.data.user });
    }
    return res?.data?.user;
  };

  const fetchSessions = async (): Promise<UserSession[]> => {
    const res: any = await api.get('/auth/sessions');
    return res?.data?.sessions || [];
  };

  const revokeSession = async (sessionId: string) => {
    await api.delete(`/auth/sessions/${sessionId}`);
  };

  const logoutOtherDevices = async () => {
    await api.post('/auth/logout-others');
  };

  const logoutAllDevices = async () => {
    await api.post('/auth/logout-all');
    logout();
  };

  const fetchLoginHistory = async (): Promise<LoginHistoryItem[]> => {
    const res: any = await api.get('/auth/security/login-history');
    return res?.data?.history || [];
  };

  const deleteAccount = async (passwordConfirmation?: string) => {
    await api.delete('/auth/account', { data: { passwordConfirmation } });
    logout();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignored
    } finally {
      localStorage.removeItem('chatflow_token');
      localStorage.removeItem('chatflow_refresh_token');
      localStorage.removeItem('chatflow_session_token');
      localStorage.removeItem('chatflow_org_id');
      socketService.disconnect();
      setUser(null);
      setOrganizations([]);
      setCurrentOrganization(null);
    }
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('chatflow_org_id', org.id);
      socketService.joinOrg(org.id);
    }
  };

  const refreshUserData = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrganization,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        loginWithGoogle,
        getGoogleAuthUrl,
        sendOtp,
        verifyOtp,
        verifyEmail,
        resendVerificationEmail,
        forgotPassword,
        resetPassword,
        changePassword,
        updateProfile,
        fetchSessions,
        revokeSession,
        logoutOtherDevices,
        logoutAllDevices,
        fetchLoginHistory,
        deleteAccount,
        logout,
        switchOrganization,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
