import React from 'react';
import {
  LayoutDashboard,
  Activity,
  MapPin,
  BellRing,
  BarChart3,
  Cpu,
  Users,
  Settings,
  Boxes,
  Waves,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeAlertCount: number;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeAlertCount,
  currentRole,
  setCurrentRole,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'monitoring' as ActiveTab, label: 'Live Telemetry', icon: Activity },
    { id: 'stations' as ActiveTab, label: 'Monitoring Stations', icon: MapPin },
    {
      id: 'alerts' as ActiveTab,
      label: 'Alert Management',
      icon: BellRing,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    { id: 'analytics' as ActiveTab, label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'sensors' as ActiveTab, label: 'Sensor Inventory', icon: Cpu },
    { id: 'users' as ActiveTab, label: 'User Management', icon: Users },
    { id: 'settings' as ActiveTab, label: 'Settings & Thresholds', icon: Settings },
    { id: 'devops' as ActiveTab, label: 'DevOps & Architecture', icon: Boxes },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#102A43] text-slate-100 flex flex-col border-r border-[#1e3a5f] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#1e3a5f]">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-[#168AAD] flex items-center justify-center shadow-md">
            <Waves className="w-6 h-6 text-[#102A43]" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              <span>AquaWatch</span>
              <span className="text-[10px] font-mono uppercase bg-[#168AAD]/30 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-300">Water Quality & Anomaly Engine</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Operational Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#168AAD] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1b3a5c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* RBAC Role Switcher */}
        <div className="p-4 mx-3 mb-3 rounded-lg bg-[#0c1f33] border border-[#1e3a5f]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulated Role</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">{currentRole}</span>
          </div>

          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            className="w-full text-xs bg-[#102A43] border border-[#2a4d74] text-slate-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-cyan-400 cursor-pointer"
          >
            <option value="Administrator">Administrator (Full Access)</option>
            <option value="Monitoring Operator">Monitoring Operator (Ops & Alerts)</option>
            <option value="Viewer">Viewer (Read-Only)</option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
            Switch roles to test permissions & write restrictions across UI views.
          </p>
        </div>

        {/* Profile Footer */}
        <div className="p-3 border-t border-[#1e3a5f] bg-[#0c1f33] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-xs">
            {currentRole === 'Administrator' ? 'SC' : currentRole === 'Monitoring Operator' ? 'MV' : 'ER'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {currentRole === 'Administrator'
                ? 'Dr. Sarah Chen'
                : currentRole === 'Monitoring Operator'
                ? 'Marcus Vance'
                : 'Elena Rostova'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {currentRole}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
