import React from 'react';
import {
  Users,
  ShieldCheck,
  Check,
  X,
  UserPlus,
  Key,
  Shield,
  Clock,
  Mail,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementViewProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentRole,
  setCurrentRole,
}) => {
  const users: User[] = [
    {
      id: 'USR-01',
      name: 'Dr. Sarah Chen',
      email: 'sarah.chen@aquawatch.io',
      role: 'Administrator',
      department: 'Environmental Safety & Water Directorate',
      lastLogin: '2026-11-10 14:22 UTC',
      status: 'Active',
    },
    {
      id: 'USR-02',
      name: 'Marcus Vance',
      email: 'marcus.v@aquawatch.io',
      role: 'Monitoring Operator',
      department: 'Field Operations & Sensor Calibration',
      lastLogin: '2026-11-11 06:45 UTC',
      status: 'Active',
    },
    {
      id: 'USR-03',
      name: 'Elena Rostova',
      email: 'elena.r@aquawatch.io',
      role: 'Viewer',
      department: 'Regional Compliance & Public Affairs',
      lastLogin: '2026-11-09 11:15 UTC',
      status: 'Active',
    },
  ];

  const permissionsMatrix = [
    {
      feature: 'View Live Parameter Telemetry & Dashboard',
      admin: true,
      operator: true,
      viewer: true,
    },
    {
      feature: 'Export Telemetry CSV & Generate Compliance PDF',
      admin: true,
      operator: true,
      viewer: true,
    },
    {
      feature: 'Acknowledge Environmental Alerts',
      admin: true,
      operator: true,
      viewer: false,
    },
    {
      feature: 'Resolve Alerts & Log Investigation Notes',
      admin: true,
      operator: true,
      viewer: false,
    },
    {
      feature: 'Trigger Simulated Anomaly / Contaminant Injections',
      admin: true,
      operator: true,
      viewer: false,
    },
    {
      feature: 'Update Water Quality Thresholds & Presets',
      admin: true,
      operator: false,
      viewer: false,
    },
    {
      feature: 'Register / Decommission Stations & IoT Probes',
      admin: true,
      operator: false,
      viewer: false,
    },
    {
      feature: 'Manage User Accounts & RBAC Provisioning',
      admin: true,
      operator: false,
      viewer: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#168AAD]" />
            <span>Role-Based Access Control (RBAC) & User Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic JWT session enforcement across Administrator, Operator, and Viewer scopes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Current Role Active:</span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Role Testing Interactive Switcher */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 via-cyan-900/10 to-transparent border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-500" />
            <span>Interactive RBAC Evaluation Sandbox</span>
          </div>
          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
            Click to switch the active user perspective and verify dynamic permission enforcement across all views.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['Administrator', 'Monitoring Operator', 'Viewer'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setCurrentRole(r)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRole === r
                  ? 'bg-[#168AAD] text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Authorized Personnel Directory
          </h3>
          <span className="text-xs font-mono text-slate-400">3 Users Provisioned</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-mono uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Privilege</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        u.role === 'Administrator'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                          : u.role === 'Monitoring Operator'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {u.department}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {u.lastLogin}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>{u.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Role Permission Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Explicit functional capabilities mapped across system roles.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-mono uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Operational Capability</th>
                <th className="py-3 px-4 text-center">Administrator</th>
                <th className="py-3 px-4 text-center">Monitoring Operator</th>
                <th className="py-3 px-4 text-center">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {permissionsMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {item.feature}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.admin ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.operator ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.viewer ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
