import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Eye,
  Sliders,
  Droplets,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  ExternalLink,
} from 'lucide-react';
import { Station, SensorRecord, ReadingRecord } from '../types';
import { QualityStatus } from '../utils/waterQuality';
import { MiniSparkline } from './common/Charts';

interface StationsViewProps {
  stations: Station[];
  sensors: SensorRecord[];
  history: ReadingRecord[];
  onAddStation: (newStationData: any) => void;
  onSelectStation: (stationId: string) => void;
}

export const StationsView: React.FC<StationsViewProps> = ({
  stations,
  sensors,
  history,
  onAddStation,
  onSelectStation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding station
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSource, setFormSource] = useState<'River' | 'Reservoir' | 'Lake' | 'Treatment Plant' | 'Estuary'>('River');
  const [formCapacity, setFormCapacity] = useState('25.0');
  const [formLat, setFormLat] = useState('37.7600');
  const [formLng, setFormLng] = useState('-122.4200');

  // Filter stations
  const filteredStations = stations.filter((stn) => {
    const matchesSearch =
      stn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stn.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stn.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || stn.waterSourceType === sourceFilter;
    const matchesStatus = statusFilter === 'all' || stn.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    onAddStation({
      name: formName,
      code: formCode || `STN-${Date.now().toString(36).toUpperCase()}`,
      location: formLocation || 'Watershed Node',
      waterSourceType: formSource,
      capacityMGD: parseFloat(formCapacity) || 15.0,
      lat: parseFloat(formLat) || 37.75,
      lng: parseFloat(formLng) || -122.42,
    });

    setIsAddModalOpen(false);
    setFormName('');
    setFormCode('');
    setFormLocation('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#168AAD]" />
            <span>Water Quality Monitoring Stations Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage catchment points, treatment facilities, intake reservoirs, and sensor arrays.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Station</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by station name, code, or geographical location..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#102A43] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-hidden"
          >
            <option value="all">All Water Sources</option>
            <option value="Reservoir">Reservoir</option>
            <option value="River">River</option>
            <option value="Lake">Lake</option>
            <option value="Treatment Plant">Treatment Plant</option>
            <option value="Estuary">Estuary</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Normal">Normal (Safe)</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Stations Table */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-mono uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Station Code</th>
                <th className="py-3 px-4">Name & Location</th>
                <th className="py-3 px-4">Source Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Sensors</th>
                <th className="py-3 px-4">WQI Score</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStations.map((station) => {
                const stationSensorCount = sensors.filter((s) => s.stationId === station.id).length;

                return (
                  <tr
                    key={station.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {station.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {station.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{station.location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {station.waterSourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {station.capacityMGD} MGD
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {stationSensorCount || station.activeSensorsCount} Probes
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {station.wqi}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({station.wqiRating})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                          station.status === 'Critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300'
                            : station.status === 'Warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            station.status === 'Critical'
                              ? 'bg-red-500 animate-ping'
                              : station.status === 'Warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {station.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedStation(station)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Station Details Modal / Drawer */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedStation(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStation.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Code: {selectedStation.code} · Coordinates: {selectedStation.coordinates.lat.toFixed(4)}, {selectedStation.coordinates.lng.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Source Type</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {selectedStation.waterSourceType}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Daily Capacity</div>
                <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                  {selectedStation.capacityMGD} MGD
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Water Quality Index</div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedStation.wqi} ({selectedStation.wqiRating})
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Status</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {selectedStation.status}
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono mb-2">
              Attached Sensor Array & Telemetry Channels
            </h4>
            <div className="space-y-2 mb-6">
              {sensors
                .filter((s) => s.stationId === selectedStation.id)
                .map((sensor) => (
                  <div
                    key={sensor.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {sensor.parameterName}
                      </span>
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">
                        ({sensor.serialNumber})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {sensor.status}
                      </span>
                      <span className="text-slate-400">Battery: {sensor.batteryPercent}%</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedStation(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Station Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Register New Water Monitoring Station
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Provision a new physical or virtual telemetry node into the MongoDB-backed registry.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Station Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bear Valley Headwaters Intake"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Station Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. BVH-IN-07"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Water Source
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="River">River / Creek</option>
                    <option value="Reservoir">Reservoir</option>
                    <option value="Lake">Freshwater Lake</option>
                    <option value="Treatment Plant">Treatment Facility</option>
                    <option value="Estuary">Estuary / Delta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Geographical Location Description
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Watershed Mile 22, Elevation 410m"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Capacity (MGD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white"
                >
                  Create Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
