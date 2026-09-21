import React, { createContext, useContext, useState, useEffect } from 'react';
import { socketService } from '../services/socket';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type?: 'INFO' | 'LEAD' | 'SUPPORT' | 'CAMPAIGN' | 'SUCCESS' | 'ERROR';
}

interface NotificationContextType {
  notifications: ToastNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (notif: Omit<ToastNotification, 'id'>) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newNotif = { ...notif, id };

    setNotifications((prev) => [newNotif, ...prev]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 6000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const handleIncomingNotif = (notif: any) => {
      addNotification({
        title: notif.title,
        message: notif.message,
        type: notif.type,
      });
    };

    const handleInboundMsg = (data: any) => {
      addNotification({
        title: `WhatsApp Message from ${data.customer?.name || 'Customer'}`,
        message: data.message?.content?.substring(0, 80) || 'New message received',
        type: 'INFO',
      });
    };

    const handleLeadCreated = (lead: any) => {
      addNotification({
        title: 'New Lead Captured! 🎯',
        message: `${lead.customer?.name || 'Customer'} is interested in ${lead.product?.name || 'a product'}`,
        type: 'LEAD',
      });
    };

    socketService.on('notification:new', handleIncomingNotif);
    socketService.on('conversation:inbound', handleInboundMsg);
    socketService.on('lead:created', handleLeadCreated);

    return () => {
      socketService.off('notification:new', handleIncomingNotif);
      socketService.off('conversation:inbound', handleInboundMsg);
      socketService.off('lead:created', handleLeadCreated);
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
      {/* Toast popup alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-slate-800 backdrop-blur-md flex items-start justify-between gap-3 animate-slide-in transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {n.type === 'LEAD' && <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">New Lead</span>}
                {n.type === 'SUPPORT' && <span className="text-xs bg-amber-500/20 text-amber-400 font-semibold px-2 py-0.5 rounded-full">Support</span>}
                <p className="text-sm font-semibold text-white">{n.title}</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-slate-400 hover:text-white text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
