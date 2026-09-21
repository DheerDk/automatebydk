import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { BusinessSettings, WhatsAppAccountSummary } from '../types';

interface TenantContextType {
  settings: BusinessSettings | null;
  whatsappAccount: WhatsAppAccountSummary | null;
  currency: string;
  isWhatsAppConnected: boolean;
  isLoading: boolean;
  refetchSettings: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [whatsappAccount, setWhatsappAccount] = useState<WhatsAppAccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      const res: any = await api.get('/settings');
      if (res.data) {
        setSettings(res.data.settings);
        setWhatsappAccount(res.data.whatsappAccount);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [currentOrganization?.id]);

  const currency = settings?.currency || 'INR';
  const isWhatsAppConnected = whatsappAccount?.status === 'CONNECTED';

  return (
    <TenantContext.Provider
      value={{
        settings,
        whatsappAccount,
        currency,
        isWhatsAppConnected,
        isLoading,
        refetchSettings: fetchSettings,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
