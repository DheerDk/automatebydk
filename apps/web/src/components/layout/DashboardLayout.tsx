import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { WhatsAppSimulatorModal } from '../simulator/WhatsAppSimulatorModal';

export const DashboardLayout: React.FC = () => {
  const { user, currentOrganization, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading ChatFlow AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onMenuToggle={() => setIsSidebarOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        {/* Verification Status Banner if applicable */}
        {currentOrganization?.status === 'PENDING_APPROVAL' && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              <span>
                Account Verification in Progress: Your business workspace is provisioned. Live WhatsApp automation is undergoing Super Admin review.
              </span>
            </div>
            <span className="text-[10px] bg-slate-950 text-amber-400 px-2 py-0.5 rounded font-black">
              Under Review
            </span>
          </div>
        )}

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* WhatsApp Interactive Simulator Modal */}
      <WhatsAppSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
