import React, { useState } from 'react';
import {
  BellRing,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShieldAlert,
  UserCheck,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { AlertRecord, Station } from '../types';

interface AlertsViewProps {
  alerts: AlertRecord[];
  stations: Station[];
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string, rootCause: string, notes: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  stations,
  onAcknowledgeAlert,
  onResolveAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'active' | 'resolved'>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingAlert, setResolvingAlert] = useState<AlertRecord | null>(null);

  // Resolution modal state
  const [rootCause, setRootCause] = useState('Industrial Discharge / Storm Runoff');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Counts
  const criticalCount = alerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length;
  const warningCount = alerts.filter((a) => a.severity === 'Warning' && a.status !== 'Resolved').length;
  const activeCount = alerts.filter((a) => a.status !== 'Resolved').length;
  const resolvedCount = alerts.filter((a) => a.status === 'Resolved').length;

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    const matchesStation = stationFilter === 'all' || a.stationId === stationFilter;
    const matchesSearch =
      a.parameterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'critical') matchesTab = a.severity === 'Critical' && a.status !== 'Resolved';
    else if (activeTab === 'warning') matchesTab = a.severity === 'Warning' && a.status !== 'Resolved';
    else if (activeTab === 'active') matchesTab = a.status !== 'Resolved';
    else if (activeTab === 'resolved') matchesTab = a.status === 'Resolved';

    return matchesStation && matchesSearch && matchesTab;
  });

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;

    onResolveAlert(
      resolvingAlert.id,
      rootCause,
      resolutionNotes || 'Remediated via emergency diversion and neutralization protocol.'
    );

    setResolvingAlert(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-red-500" />
            <span>Water Quality Incident & Alert Management Center</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated multi-parameter breach detection, deduplication tracking, and resolution auditing.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-bold">
            {criticalCount} Critical
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold">
            {warningCount} Warning
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold">
            {resolvedCount} Resolved
          </span>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All Alerts (${alerts.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'critical', label: `Critical (${criticalCount})` },
            { id: 'warning', label: `Warning (${warningCount})` },
            { id: 'resolved', label: `Resolved (${resolvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#168AAD] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and station filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alert description..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#102A43] text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Stations</option>
            {stations.map((stn) => (
              <option key={stn.id} value={stn.id}>
                {stn.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
              No matching alerts found in this view.
            </span>
            <span>All monitored water quality parameters comply with safety guidelines.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.status === 'Resolved'
                  ? 'bg-white/60 dark:bg-[#102A43]/50 border-slate-200 dark:border-slate-800 opacity-80'
                  : alert.severity === 'Critical'
                  ? 'bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 shadow-xs'
                  : 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        alert.severity === 'Critical'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {alert.id}
                    </span>

                    <span className="text-slate-400">·</span>

                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {alert.stationName}
                    </span>

                    {alert.occurrenceCount > 1 && (
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                        {alert.occurrenceCount} Occurrences (Deduplicated)
                      </span>
                    )}

                    <span
                      className={`text-[11px] font-medium ml-auto sm:ml-0 ${
                        alert.status === 'Resolved'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : alert.status === 'Acknowledged'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-red-600 dark:text-red-400 font-bold'
                      }`}
                    >
                      [{alert.status}]
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                    <div>
                      Observed: <strong className="text-slate-900 dark:text-white">{alert.observedValue} {alert.unit}</strong>
                    </div>
                    <div>
                      Standard Range: <span>{alert.expectedRange}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Resolution Notes preview if resolved */}
                  {alert.status === 'Resolved' && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolution by {alert.resolvedBy || 'Operator'}: {alert.rootCause}</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {alert.resolutionNotes}
                      </div>
                    </div>
                  )}

                  {/* Acknowledgment tag if acknowledged */}
                  {alert.status === 'Acknowledged' && alert.acknowledgedBy && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono pt-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Acknowledged by {alert.acknowledgedBy} at {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleTimeString() : ''}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {alert.status !== 'Resolved' && (
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {alert.status === 'Active' && (
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => setResolvingAlert(alert)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve Incident</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setResolvingAlert(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Resolve Water Quality Incident
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Document root cause investigation and corrective mitigation actions taken for audit compliance.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Alert ID & Station</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {resolvingAlert.id} · {resolvingAlert.stationName}
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">
                  Parameter: {resolvingAlert.parameterName} ({resolvingAlert.observedValue} {resolvingAlert.unit})
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Root Cause Category *
                </label>
                <select
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Industrial Runoff / Upstream Effluent">Industrial Runoff / Upstream Effluent</option>
                  <option value="Heavy Storm Precipitation Siltation">Heavy Storm Precipitation Siltation</option>
                  <option value="Algal Bloom & Eutrophication (Hypoxia)">Algal Bloom & Eutrophication (Hypoxia)</option>
                  <option value="Sensor Bio-Fouling & Calibration Drift">Sensor Bio-Fouling & Calibration Drift</option>
                  <option value="Water Treatment Chemical Metering Fluctuation">Water Treatment Chemical Metering Fluctuation</option>
                  <option value="Emergency Flush & Remediation Completed">Emergency Flush & Remediation Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Technician Investigation Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail corrective actions (e.g. secondary aeration engaged, coagulation dosed, verification probe matched normal standard)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mark Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
