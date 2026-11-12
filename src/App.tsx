/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { StationsView } from './components/StationsView';
import { AlertsView } from './components/AlertsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SensorManagementView } from './components/SensorManagementView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { DevOpsExplorerView } from './components/DevOpsExplorerView';
import { Station, SensorRecord, ReadingRecord, AlertRecord, ActiveTab, UserRole } from './types';
import { DEFAULT_THRESHOLDS, DefaultThresholds } from './utils/waterQuality';
import { CheckCircle2, X } from 'lucide-react';
import { apiFetch } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Administrator');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [stations, setStations] = useState<Station[]>([]);
  const [sensors, setSensors] = useState<SensorRecord[]>([]);
  const [latestReadings, setLatestReadings] = useState<{ station: Station; reading: ReadingRecord | null }[]>([]);
  const [history, setHistory] = useState<ReadingRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [thresholds, setThresholds] = useState<DefaultThresholds>(DEFAULT_THRESHOLDS);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(true);

  // Quick Resolve Modal State
  const [quickResolveAlert, setQuickResolveAlert] = useState<AlertRecord | null>(null);
  const [modalRootCause, setModalRootCause] = useState('Industrial Discharge / Storm Runoff');
  const [modalNotes, setModalNotes] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasDataError = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync dark mode class on documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch telemetry and application state
  const fetchData = useCallback(async () => {
    try {
      const [stnRes, snsRes, rdgRes, histRes, altRes, thrRes] = await Promise.all([
        apiFetch<any[]>('/api/stations'),
        apiFetch<any[]>('/api/sensors'),
        apiFetch<any[]>('/api/readings/latest'),
        apiFetch<any[]>('/api/readings/history?limit=120'),
        apiFetch<any[]>('/api/alerts'),
        apiFetch<DefaultThresholds>('/api/thresholds'),
      ]);

      const latestByStation = new Map(
        rdgRes.data.map((reading) => [reading.stationId, reading])
      );
      const mappedStations: Station[] = stnRes.data.map((station) => {
        const latest = latestByStation.get(station.id);
        const score = latest?.wqiScore ?? 0;
        return {
          ...station,
          coordinates: {
            lat: station.latitude,
            lng: station.longitude,
          },
          waterSourceType: station.waterSourceType,
          capacityMGD: station.capacityMGD ?? station.capacityMgd ?? 10,
          activeSensorsCount: snsRes.data.filter((sensor) => sensor.stationId === station.id).length,
          lastReadingTime: latest?.timestamp ?? station.createdAt ?? '',
          wqi: score,
          wqiRating: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Fair' : score ? 'Poor' : 'No data',
        };
      });
      const stationsById = new Map(mappedStations.map((station) => [station.id, station]));
      const mapReading = (reading: any): ReadingRecord => ({
        ...reading,
        stationName: stationsById.get(reading.stationId)?.name ?? reading.stationId,
        wqi: reading.wqiScore ?? 0,
        isSimulated: reading.isSimulated ?? true,
      });

      setStations(mappedStations);
      setSensors(snsRes.data.map((sensor) => ({
        ...sensor,
        stationName: stationsById.get(sensor.stationId)?.name ?? sensor.stationId,
        lastCalibration: sensor.lastCalibration ?? sensor.lastCalibratedAt ?? '',
        lastCommunication: sensor.lastCommunication ?? sensor.lastCommunicationAt ?? '',
      })));
      setLatestReadings(mappedStations.map((station) => {
        const latest = latestByStation.get(station.id);
        return { station, reading: latest ? mapReading(latest) : null };
      }));
      setHistory(histRes.data.map(mapReading));
      setAlerts(altRes.data.map((alert) => ({
        ...alert,
        stationName: stationsById.get(alert.stationId)?.name ?? alert.stationId,
      })));
      setThresholds(thrRes.data);
      hasDataError.current = false;
    } catch (err) {
      console.error('[AquaWatch] Telemetry sync error:', err);
      if (!hasDataError.current) {
        showToast(err instanceof Error ? err.message : 'Unable to load AquaWatch data.');
        hasDataError.current = true;
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Alert Actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    if (currentRole === 'Viewer') {
      showToast('Permission Denied: Viewer role cannot acknowledge alerts.');
      return;
    }
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: `${currentRole} Operator` }),
      });

      if (res.success) {
        showToast(`Alert ${alertId} acknowledged.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to acknowledge the alert.');
    }
  };

  const handleResolveAlert = async (alertId: string, rootCause: string, notes: string) => {
    if (currentRole === 'Viewer') {
      showToast('Permission Denied: Viewer role cannot resolve alerts.');
      return;
    }
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: `${currentRole} Authority`,
          rootCause,
          resolutionNotes: notes,
        }),
      });

      if (res.success) {
        showToast(`Incident ${alertId} marked as Resolved.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to resolve the alert.');
    }
  };

  // Station Actions
  const handleAddStation = async (stationData: any) => {
    if (currentRole !== 'Administrator') {
      showToast('Permission Denied: Administrator role required to register stations.');
      return;
    }
    try {
      const res = await apiFetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stationData),
      });

      if (res.success) {
        showToast(`Station '${stationData.name}' provisioned into registry.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to create the station.');
    }
  };

  // Sensor Actions
  const handleAddSensor = async (sensorData: any) => {
    if (currentRole !== 'Administrator') {
      showToast('Permission Denied: Administrator role required to provision sensors.');
      return;
    }
    try {
      const res = await apiFetch('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensorData),
      });

      if (res.success) {
        showToast(`Sensor '${sensorData.parameterName}' assigned successfully.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to create the sensor.');
    }
  };

  const handleUpdateSensorStatus = async (sensorId: string, newStatus: string) => {
    if (currentRole === 'Viewer') {
      showToast('Permission Denied: Viewer role cannot change sensor calibration states.');
      return;
    }
    try {
      const res = await apiFetch(`/api/sensors/${sensorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        showToast(`Sensor state updated to '${newStatus}'.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to update the sensor.');
    }
  };

  // Threshold Actions
  const handleUpdateThresholds = async (newThresholds: DefaultThresholds) => {
    if (currentRole !== 'Administrator') {
      showToast('Permission Denied: Administrator role required to alter standard thresholds.');
      return;
    }
    try {
      const res = await apiFetch<DefaultThresholds>('/api/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThresholds),
      });

      if (res.success) {
        setThresholds(res.data);
        showToast('Threshold boundaries updated across evaluation cluster.');
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to update thresholds.');
    }
  };

  // Simulation Controls
  const handleToggleSimulator = async () => {
    try {
      const res = await apiFetch<{ isRunning: boolean }>('/api/simulation/toggle', { method: 'POST' });
      if (res.success) {
        setIsSimulatorRunning(res.data.isRunning);
        showToast(res.data.isRunning ? 'Simulator resumed.' : 'Simulator paused.');
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to update the simulator.');
    }
  };

  const handleInjectAnomaly = async (type: 'acid_spill' | 'turbidity_storm' | 'hypoxia_drop' | 'saline_surge') => {
    if (currentRole === 'Viewer') {
      showToast('Permission Denied: Viewer role cannot inject simulation anomalies.');
      return;
    }
    try {
      const targetStationId = stations[0]?.id || 'STN-01';
      const res = await apiFetch('/api/simulation/inject-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: targetStationId,
          anomalyType: type,
        }),
      });

      if (res.success) {
        showToast(`Contaminant anomaly '${type}' injected! Evaluation alerts triggered.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to inject the anomaly.');
    }
  };

  const handleResetSimulation = async () => {
    try {
      const res = await apiFetch('/api/simulation/reset', { method: 'POST' });
      if (res.success) {
        showToast('Telemetry stream reset to pristine baseline.');
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Unable to reset the simulator.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] dark:bg-[#0B1A2C] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-cyan-500/40 text-xs flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlertCount={alerts.filter((a) => a.status !== 'Resolved').length}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <TopBar
          currentRole={currentRole}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          alerts={alerts}
          isSimulatorRunning={isSimulatorRunning}
          onToggleSimulator={handleToggleSimulator}
          onInjectAnomaly={handleInjectAnomaly}
          onResetSimulation={handleResetSimulation}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectAlert={(a) => {
            setActiveTab('alerts');
          }}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              stations={stations}
              latestReadings={latestReadings}
              history={history}
              alerts={alerts}
              thresholds={thresholds}
              onSelectStation={(id) => {
                setActiveTab('monitoring');
              }}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onOpenResolveModal={(alert) => {
                setQuickResolveAlert(alert);
                setModalRootCause('Industrial Discharge / Storm Runoff');
                setModalNotes('');
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'monitoring' && (
            <LiveMonitoringView
              stations={stations}
              history={history}
              sensors={sensors}
              thresholds={thresholds}
              isSimulatorRunning={isSimulatorRunning}
            />
          )}

          {activeTab === 'stations' && (
            <StationsView
              stations={stations}
              sensors={sensors}
              history={history}
              onAddStation={handleAddStation}
              onSelectStation={(id) => setActiveTab('monitoring')}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              stations={stations}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onResolveAlert={handleResolveAlert}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              stations={stations}
              history={history}
              alerts={alerts}
              thresholds={thresholds}
            />
          )}

          {activeTab === 'sensors' && (
            <SensorManagementView
              sensors={sensors}
              stations={stations}
              onAddSensor={handleAddSensor}
              onUpdateSensorStatus={handleUpdateSensorStatus}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              currentRole={currentRole}
              setCurrentRole={setCurrentRole}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              thresholds={thresholds}
              onUpdateThresholds={handleUpdateThresholds}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'devops' && <DevOpsExplorerView />}
        </main>
      </div>

      {/* Quick Resolve Modal (accessible from dashboard overview) */}
      {quickResolveAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setQuickResolveAlert(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Resolve Water Quality Incident ({quickResolveAlert.id})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Station: {quickResolveAlert.stationName} · Observed: {quickResolveAlert.observedValue} {quickResolveAlert.unit}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveAlert(
                  quickResolveAlert.id,
                  modalRootCause,
                  modalNotes || 'Remediated via emergency diversion and neutralization protocol.'
                );
                setQuickResolveAlert(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Root Cause Category *
                </label>
                <select
                  value={modalRootCause}
                  onChange={(e) => setModalRootCause(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Industrial Discharge / Storm Runoff">Industrial Discharge / Storm Runoff</option>
                  <option value="Heavy Storm Precipitation Siltation">Heavy Storm Precipitation Siltation</option>
                  <option value="Algal Bloom & Eutrophication (Hypoxia)">Algal Bloom & Eutrophication (Hypoxia)</option>
                  <option value="Sensor Bio-Fouling & Calibration Drift">Sensor Bio-Fouling & Calibration Drift</option>
                  <option value="Emergency Flush & Remediation Completed">Emergency Flush & Remediation Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Detail remediation actions taken..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickResolveAlert(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
