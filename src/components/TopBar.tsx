import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AlertRecord, UserRole } from '../types';

interface TopBarProps {
  currentRole: UserRole;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onOpenMobileSidebar: () => void;
  alerts: AlertRecord[];
  isSimulatorRunning: boolean;
  onToggleSimulator: () => void;
  onInjectAnomaly: (type: 'acid_spill' | 'turbidity_storm' | 'hypoxia_drop' | 'saline_surge') => void;
  onResetSimulation: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectAlert: (alert: AlertRecord) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRole,
  isDarkMode,
  setIsDarkMode,
  onOpenMobileSidebar,
  alerts,
  isSimulatorRunning,
  onToggleSimulator,
  onInjectAnomaly,
  onResetSimulation,
  searchQuery,
  setSearchQuery,
  onSelectAlert,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAnomalyMenuOpen, setIsAnomalyMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter((a) => a.status !== 'Resolved');

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#102A43] border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between gap-4 transition-colors">
      {/* Left zone: Hamburger + Title / Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-sm hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations, parameters, alerts..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Right zone: Telemetry simulation controls, Clock, Alerts, Theme, Profile */}
      <div className="flex items-center gap-3">
        {/* Simulation status pill & controls */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSimulatorRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {isSimulatorRunning ? 'SIMULATOR LIVE' : 'SIMULATOR PAUSED'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Pause/Resume button */}
          <button
            onClick={onToggleSimulator}
            title={isSimulatorRunning ? 'Pause simulation stream' : 'Resume simulation stream'}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded"
            aria-label={isSimulatorRunning ? 'Pause simulation' : 'Resume simulation'}
          >
            {isSimulatorRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Reset button */}
          <button
            onClick={onResetSimulation}
            title="Reset telemetry to baseline"
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded"
            aria-label="Reset simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Inject Anomaly dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setIsAnomalyMenuOpen(!isAnomalyMenuOpen)}
              className="px-2 py-0.5 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1 shadow-xs transition-colors"
            >
              <Zap className="w-3 h-3" />
              <span>Simulate Incident</span>
            </button>

            {isAnomalyMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 font-semibold text-slate-400 text-[10px] uppercase border-b border-slate-100 dark:border-slate-700">
                  Inject Contaminant Anomaly
                </div>
                <button
                  onClick={() => {
                    onInjectAnomaly('acid_spill');
                    setIsAnomalyMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <div>
                    <div className="font-medium">Acidic Industrial Spill</div>
                    <div className="text-[10px] text-slate-400">Drops pH to 4.10 (Severe Acid)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onInjectAnomaly('turbidity_storm');
                    setIsAnomalyMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <div>
                    <div className="font-medium">Storm Runoff Silt Surge</div>
                    <div className="text-[10px] text-slate-400">Turbidity spikes to 24.5 NTU</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onInjectAnomaly('hypoxia_drop');
                    setIsAnomalyMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <div>
                    <div className="font-medium">Algal Bloom Hypoxia</div>
                    <div className="text-[10px] text-slate-400">Dissolved Oxygen drops to 2.4 mg/L</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Clock */}
        <div className="hidden xl:block font-mono text-[11px] text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
          {timeStr}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="View recent notifications"
          >
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts dropdown */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                    Active Quality Alerts ({activeAlerts.length})
                  </h4>
                </div>
                <button
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {activeAlerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span>All water parameters nominal. No active incidents.</span>
                  </div>
                ) : (
                  activeAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        onSelectAlert(alert);
                        setIsAlertsOpen(false);
                      }}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            alert.severity === 'Critical'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {alert.parameterName} @ {alert.stationName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {alert.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
