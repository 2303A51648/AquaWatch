import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Signal,
  Battery,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Station, ReadingRecord, SensorRecord } from '../types';
import { DefaultThresholds, WaterParameterKey } from '../utils/waterQuality';
import { InteractiveTimeSeries } from './common/Charts';

interface LiveMonitoringViewProps {
  stations: Station[];
  history: ReadingRecord[];
  sensors: SensorRecord[];
  thresholds: DefaultThresholds;
  isSimulatorRunning: boolean;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  stations,
  history,
  sensors,
  thresholds,
  isSimulatorRunning,
}) => {
  if (!stations || stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-mono">Connecting to telemetry stream...</div>
      </div>
    );
  }

  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id || 'STN-01');
  const [selectedParam, setSelectedParam] = useState<WaterParameterKey>('ph');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];
  const stationSensors = sensors.filter((s) => s.stationId === selectedStationId);

  // Filter history records
  const stationHistory = history.filter((h) => h.stationId === selectedStationId);
  const latestRecord = stationHistory.slice(-1)[0];

  // Parameters configuration list
  const paramMeta: {
    key: WaterParameterKey;
    name: string;
    unit: string;
    color: string;
    minNormal: number;
    maxNormal: number;
  }[] = [
    {
      key: 'ph',
      name: 'pH Level',
      unit: thresholds.ph.unit,
      color: '#0EA5E9',
      minNormal: thresholds.ph.minNormal,
      maxNormal: thresholds.ph.maxNormal,
    },
    {
      key: 'turbidity',
      name: 'Turbidity',
      unit: thresholds.turbidity.unit,
      color: '#F59E0B',
      minNormal: thresholds.turbidity.minNormal,
      maxNormal: thresholds.turbidity.maxNormal,
    },
    {
      key: 'dissolvedOxygen',
      name: 'Dissolved Oxygen',
      unit: thresholds.dissolvedOxygen.unit,
      color: '#10B981',
      minNormal: thresholds.dissolvedOxygen.minNormal,
      maxNormal: thresholds.dissolvedOxygen.maxNormal,
    },
    {
      key: 'temperature',
      name: 'Water Temperature',
      unit: thresholds.temperature.unit,
      color: '#EC4899',
      minNormal: thresholds.temperature.minNormal,
      maxNormal: thresholds.temperature.maxNormal,
    },
    {
      key: 'tds',
      name: 'Total Dissolved Solids',
      unit: thresholds.tds.unit,
      color: '#8B5CF6',
      minNormal: thresholds.tds.minNormal,
      maxNormal: thresholds.tds.maxNormal,
    },
    {
      key: 'conductivity',
      name: 'Electrical Conductivity',
      unit: thresholds.conductivity.unit,
      color: '#06B6D4',
      minNormal: thresholds.conductivity.minNormal,
      maxNormal: thresholds.conductivity.maxNormal,
    },
  ];

  const currentParamMeta = paramMeta.find((p) => p.key === selectedParam)!;

  // Chart data points
  const chartPoints = stationHistory.map((h) => ({
    timestamp: h.timestamp,
    value: h[selectedParam],
  }));

  return (
    <div className="space-y-6">
      {/* View Header with Filters */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#168AAD]" />
            <span>High-Frequency Sensor Telemetry Monitor</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time calibrated stream with continuous threshold envelope validation.
          </p>
        </div>

        {/* Station Dropdown & Range Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
          >
            {stations.map((stn) => (
              <option key={stn.id} value={stn.id}>
                {stn.name} ({stn.code})
              </option>
            ))}
          </select>

          {/* Time range pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            {(['1h', '6h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors ${
                  timeRange === r
                    ? 'bg-white dark:bg-[#168AAD] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parameter Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {paramMeta.map((p) => {
          const isSelected = selectedParam === p.key;
          const val = latestRecord ? latestRecord[p.key] : '--';
          return (
            <button
              key={p.key}
              onClick={() => setSelectedParam(p.key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-slate-800 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#102A43] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {p.name}
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {val} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Safe</span>
                <span className="font-mono">{p.minNormal}–{p.maxNormal}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Time Series Chart */}
      <div className="bg-white dark:bg-[#102A43] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {currentParamMeta.name} Time-Series Trend
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Shaded green band illustrates EPA/WHO acceptable limits. Green dashed lines denote safety bounds.
            </span>
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {chartPoints.length} Data Points Synced
          </div>
        </div>

        <InteractiveTimeSeries
          data={chartPoints}
          title={currentParamMeta.name}
          unit={currentParamMeta.unit}
          minNormal={currentParamMeta.minNormal}
          maxNormal={currentParamMeta.maxNormal}
          color={currentParamMeta.color}
          height={280}
        />
      </div>

      {/* Sensor Probes Hardware Telemetry Status */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Physical Sensor Pod Health & Calibration at {selectedStation.name}
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Telemetry Link Online
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stationSensors.map((sensor) => (
            <div
              key={sensor.id}
              className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {sensor.parameterName}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold uppercase">
                  {sensor.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                Model: {sensor.model} · S/N: {sensor.serialNumber}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Battery className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{sensor.batteryPercent}%</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Signal className="w-3.5 h-3.5 text-blue-500" />
                  <span>{sensor.signalRssi} dBm</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cal: {sensor.lastCalibration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
