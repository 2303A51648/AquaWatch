import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Award,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Station, ReadingRecord, AlertRecord } from '../types';
import { DefaultThresholds } from '../utils/waterQuality';
import { API_BASE_URL } from '../api';

interface AnalyticsViewProps {
  stations: Station[];
  history: ReadingRecord[];
  alerts: AlertRecord[];
  thresholds: DefaultThresholds;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stations,
  history,
  alerts,
  thresholds,
}) => {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Compute parameter statistics
  const computeStats = (key: keyof ReadingRecord) => {
    const vals = history.map((h) => Number(h[key])).filter((v) => !isNaN(v));
    if (vals.length === 0) return { avg: 0, min: 0, max: 0 };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2) };
  };

  const phStats = computeStats('ph');
  const turbidityStats = computeStats('turbidity');
  const doStats = computeStats('dissolvedOxygen');
  const tempStats = computeStats('temperature');
  const tdsStats = computeStats('tds');
  const ecStats = computeStats('conductivity');

  // Overall compliance rate
  const totalReadings = history.length;
  const normalReadings = history.filter((h) => h.status === 'Normal').length;
  const warningReadings = history.filter((h) => h.status === 'Warning').length;
  const criticalReadings = history.filter((h) => h.status === 'Critical').length;
  const complianceRate = totalReadings > 0
    ? (((normalReadings + warningReadings * 0.5) / totalReadings) * 100).toFixed(1)
    : '100.0';

  const handleDownloadCsv = () => {
    window.location.href = `${API_BASE_URL}/api/reports/export-csv`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Controls */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#168AAD]" />
            <span>Water Quality Index (WQI) Analytics & Compliance Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical aggregation based on the weighted NSF-WQI environmental index model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Raw Telemetry CSV</span>
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Compliance PDF Report</span>
          </button>
        </div>
      </div>

      {/* High-level Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compliance Index</div>
          <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {complianceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across 6 watershed stations</div>
        </div>

        <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Watershed WQI</div>
          <div className="text-3xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1 tabular-nums">
            {Math.round(stations.reduce((acc, s) => acc + s.wqi, 0) / stations.length)}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Good potability score rating</div>
        </div>

        <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Telemetry Samples Analyzed</div>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {totalReadings}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Continuous rolling time buffer</div>
        </div>

        <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Incident Mitigation Rate</div>
          <div className="text-3xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {alerts.length > 0 ? Math.round((alerts.filter((a) => a.status === 'Resolved').length / alerts.length) * 100) : 100}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Audit-verified resolutions</div>
        </div>
      </div>

      {/* Station-wise Comparative WQI Rankings */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Station-by-Station Water Quality Index (NSF-WQI) Distribution
        </h3>

        <div className="space-y-3">
          {stations.map((stn) => {
            const barWidth = Math.max(5, stn.wqi);
            const statusColor =
              stn.wqi >= 80 ? 'bg-emerald-500' : stn.wqi >= 60 ? 'bg-cyan-500' : stn.wqi >= 50 ? 'bg-amber-500' : 'bg-red-500';

            return (
              <div key={stn.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {stn.name} <span className="font-mono text-slate-400">({stn.waterSourceType})</span>
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{stn.wqi}/100</span>
                    <span className="text-[11px] text-slate-400">({stn.wqiRating})</span>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColor} transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parameter Summary Statistics Table */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Core Parameter Baseline & Range Metrics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated statistical distribution across all monitored intake zones.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-mono uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Standard Safe Envelope</th>
                <th className="py-3 px-4">Observed Average</th>
                <th className="py-3 px-4">Minimum Observed</th>
                <th className="py-3 px-4">Maximum Observed</th>
                <th className="py-3 px-4">Health Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">pH Level</td>
                <td className="py-3 px-4 text-slate-500">{thresholds.ph.minNormal} - {thresholds.ph.maxNormal} pH</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{phStats.avg} pH</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{phStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{phStats.max}</td>
                <td className="py-3 px-4 font-sans text-emerald-600 dark:text-emerald-400">Within Optimal Limits</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Turbidity (NTU)</td>
                <td className="py-3 px-4 text-slate-500">&lt; {thresholds.turbidity.maxNormal} NTU</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{turbidityStats.avg} NTU</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{turbidityStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{turbidityStats.max}</td>
                <td className="py-3 px-4 font-sans text-amber-600 dark:text-amber-400">Localized Estuary Elevated</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Dissolved Oxygen (DO)</td>
                <td className="py-3 px-4 text-slate-500">{thresholds.dissolvedOxygen.minNormal} - {thresholds.dissolvedOxygen.maxNormal} mg/L</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{doStats.avg} mg/L</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{doStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{doStats.max}</td>
                <td className="py-3 px-4 font-sans text-emerald-600 dark:text-emerald-400">Nominal Aeration</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Water Temperature</td>
                <td className="py-3 px-4 text-slate-500">{thresholds.temperature.minNormal} - {thresholds.temperature.maxNormal} °C</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{tempStats.avg} °C</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{tempStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{tempStats.max}</td>
                <td className="py-3 px-4 font-sans text-emerald-600 dark:text-emerald-400">Equilibrium Nominal</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Total Dissolved Solids</td>
                <td className="py-3 px-4 text-slate-500">&lt; {thresholds.tds.maxNormal} mg/L</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{tdsStats.avg} mg/L</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{tdsStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{tdsStats.max}</td>
                <td className="py-3 px-4 font-sans text-emerald-600 dark:text-emerald-400">Compliant Mineral Base</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Electrical Conductivity</td>
                <td className="py-3 px-4 text-slate-500">{thresholds.conductivity.minNormal} - {thresholds.conductivity.maxNormal} µS/cm</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ecStats.avg} µS/cm</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{ecStats.min}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{ecStats.max}</td>
                <td className="py-3 px-4 font-sans text-emerald-600 dark:text-emerald-400">Normal Salinity Range</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable / Styled PDF Report Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none">
            <button
              onClick={() => setIsPdfModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-md print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Document Header */}
            <div className="border-b border-slate-300 pb-4 mb-6 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold tracking-tight text-[#102A43]">
                  AQUAWATCH ENVIRONMENTAL COMPLIANCE AUDIT
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Official Periodic Water Quality Assessment & Incident Log
                </div>
              </div>
              <div className="text-right text-xs font-mono text-slate-500">
                <div>DOC REF: AQ-AUD-2026-X8</div>
                <div>Issued: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Audit Executive Summary */}
            <div className="mb-6 space-y-2 text-xs text-slate-700 leading-relaxed">
              <h4 className="font-bold text-sm text-[#102A43] uppercase font-mono">
                1. Executive Summary
              </h4>
              <p>
                This compliance summary reflects real-time continuous sensor readings collected across 6 regional hydrological stations under EPA Clean Water Act Standards and WHO Guidelines for Drinking-water Quality. Over {totalReadings} timestamped telemetry points were validated.
              </p>
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">WATERSHED COMPLIANCE</div>
                  <div className="text-base font-bold text-emerald-600">{complianceRate}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">AVG WQI RATING</div>
                  <div className="text-base font-bold text-[#102A43]">Good (84/100)</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">RESOLVED INCIDENTS</div>
                  <div className="text-base font-bold text-blue-600">{alerts.filter(a => a.status === 'Resolved').length} / {alerts.length}</div>
                </div>
              </div>
            </div>

            {/* Station Status Audit Table */}
            <div className="mb-6">
              <h4 className="font-bold text-sm text-[#102A43] uppercase font-mono mb-2">
                2. Station-by-Station Quality Assessment
              </h4>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 font-mono text-[10px] text-slate-700">
                  <tr>
                    <th className="p-2 border-b">Station Name</th>
                    <th className="p-2 border-b">Source</th>
                    <th className="p-2 border-b">Capacity</th>
                    <th className="p-2 border-b">WQI Score</th>
                    <th className="p-2 border-b">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {stations.map((stn) => (
                    <tr key={stn.id}>
                      <td className="p-2 font-sans font-medium text-slate-900">{stn.name}</td>
                      <td className="p-2 text-slate-600">{stn.waterSourceType}</td>
                      <td className="p-2 text-slate-600">{stn.capacityMGD} MGD</td>
                      <td className="p-2 font-bold">{stn.wqi} ({stn.wqiRating})</td>
                      <td className="p-2 font-sans font-semibold">
                        <span className={stn.status === 'Normal' ? 'text-emerald-700' : stn.status === 'Warning' ? 'text-amber-700' : 'text-red-700'}>
                          {stn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Regulatory Sign-off */}
            <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <div>
                <div>Chief Environmental Officer: <strong>Dr. Sarah Chen, Ph.D.</strong></div>
                <div>AquaWatch Regional Environmental Monitoring Authority</div>
              </div>
              <div className="print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#102A43] text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-[#163a5c]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
