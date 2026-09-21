import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { User, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('chatflow_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res: any = await api.get('/auth/me');
      if (res.data) {
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
          socketService.connect(token);
          socketService.joinOrg(selectedOrg.id);
        }
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

  const login = async (credentials: { email: string; password: string }) => {
    const res: any = await api.post('/auth/login', credentials);
    if (res.data) {
      localStorage.setItem('chatflow_token', res.data.accessToken);
      localStorage.setItem('chatflow_refresh_token', res.data.refreshToken);

      setUser(res.data.user);
      setOrganizations(res.data.organizations || []);

      const initialOrg = res.data.currentOrganization || res.data.organizations?.[0] || null;
      if (initialOrg) {
        setCurrentOrganization(initialOrg);
        localStorage.setItem('chatflow_org_id', initialOrg.id);
        socketService.connect(res.data.accessToken);
        socketService.joinOrg(initialOrg.id);
      }
    }
  };

  const register = async (data: any) => {
    const res: any = await api.post('/auth/register', data);
    if (res.data) {
      localStorage.setItem('chatflow_token', res.data.accessToken);
      localStorage.setItem('chatflow_refresh_token', res.data.refreshToken);

      setUser(res.data.user);
      const newOrg = res.data.organization;
      setOrganizations([newOrg]);
      setCurrentOrganization(newOrg);
      localStorage.setItem('chatflow_org_id', newOrg.id);
      socketService.connect(res.data.accessToken);
      socketService.joinOrg(newOrg.id);
    }
  };

  const logout = () => {
    localStorage.removeItem('chatflow_token');
    localStorage.removeItem('chatflow_refresh_token');
    localStorage.removeItem('chatflow_org_id');
    socketService.disconnect();
    setUser(null);
    setCurrentOrganization(null);
    setOrganizations([]);
    window.location.href = '/login';
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (target) {
      setCurrentOrganization(target);
      localStorage.setItem('chatflow_org_id', target.id);
      socketService.joinOrg(target.id);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrganization,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
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
