import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Battery,
  Signal,
  CheckCircle2,
  Wrench,
  Clock,
  Sliders,
  X,
  Edit,
} from 'lucide-react';
import { SensorRecord, Station } from '../types';
import { WaterParameterKey } from '../utils/waterQuality';

interface SensorManagementViewProps {
  sensors: SensorRecord[];
  stations: Station[];
  onAddSensor: (sensorData: any) => void;
  onUpdateSensorStatus: (sensorId: string, newStatus: any) => void;
}

export const SensorManagementView: React.FC<SensorManagementViewProps> = ({
  sensors,
  stations,
  onAddSensor,
  onUpdateSensorStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add form states
  const [formStationId, setFormStationId] = useState(stations[0]?.id || 'STN-01');
  const [formParamKey, setFormParamKey] = useState<WaterParameterKey>('ph');
  const [formParamName, setFormParamName] = useState('Digital Potentiometric pH Probe');
  const [formModel, setFormModel] = useState('YSI ProDSS Multi-Parameter');
  const [formSerial, setFormSerial] = useState('');

  const filteredSensors = sensors.filter((s) => {
    const matchesSearch =
      s.parameterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.stationName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStation = stationFilter === 'all' || s.stationId === stationFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStation && matchesStatus;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSensor({
      stationId: formStationId,
      parameterKey: formParamKey,
      parameterName: formParamName,
      model: formModel,
      serialNumber: formSerial || `AQ-SN-${Date.now().toString(36).toUpperCase()}`,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#168AAD]" />
            <span>IoT Sensor Probe Inventory & Calibration Registry</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor hardware telemetry, battery degradation, RSSI RF signals, and ISO/NIST calibration cycles.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Sensor</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by probe name, model, serial number, or station..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#102A43] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-hidden"
          >
            <option value="all">All Monitoring Stations</option>
            {stations.map((stn) => (
              <option key={stn.id} value={stn.id}>
                {stn.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-hidden"
          >
            <option value="all">All Sensor States</option>
            <option value="Active">Active (Nominal)</option>
            <option value="Calibrating">Calibrating</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Sensor Table */}
      <div className="bg-white dark:bg-[#102A43] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-mono uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Sensor ID & Serial</th>
                <th className="py-3 px-4">Probe Type / Model</th>
                <th className="py-3 px-4">Assigned Station</th>
                <th className="py-3 px-4">Hardware Telemetry</th>
                <th className="py-3 px-4">Last Calibration</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSensors.map((sensor) => (
                <tr key={sensor.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">{sensor.id}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{sensor.serialNumber}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {sensor.parameterName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {sensor.model} · {sensor.firmwareVersion}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {sensor.stationName}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Battery className={`w-3.5 h-3.5 ${sensor.batteryPercent < 30 ? 'text-red-500' : 'text-emerald-500'}`} />
                        <span>{sensor.batteryPercent}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Signal className="w-3.5 h-3.5 text-blue-500" />
                        <span>{sensor.signalRssi} dBm</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {sensor.lastCalibration}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        sensor.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : sensor.status === 'Calibrating'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {sensor.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={sensor.status}
                      onChange={(e) => onUpdateSensorStatus(sensor.id, e.target.value)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2 py-1 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Active">Set Active</option>
                      <option value="Calibrating">Set Calibrating</option>
                      <option value="Maintenance">Set Maintenance</option>
                      <option value="Inactive">Set Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sensor Modal */}
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
              Provision New Sensor Probe
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add a physical IoT sensing unit to the MongoDB-backed sensor registry.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Assigned Monitoring Station *
                </label>
                <select
                  value={formStationId}
                  onChange={(e) => setFormStationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {stations.map((stn) => (
                    <option key={stn.id} value={stn.id}>
                      {stn.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Water Parameter
                  </label>
                  <select
                    value={formParamKey}
                    onChange={(e) => {
                      const k = e.target.value as WaterParameterKey;
                      setFormParamKey(k);
                      if (k === 'ph') setFormParamName('Glass Electrode pH Probe');
                      else if (k === 'turbidity') setFormParamName('Optical Turbidity Sensor');
                      else if (k === 'dissolvedOxygen') setFormParamName('Luminescent Dissolved Oxygen Sensor');
                      else if (k === 'temperature') setFormParamName('PT100 Digital Temp Sensor');
                      else if (k === 'tds') setFormParamName('Total Dissolved Solids Sensor');
                      else if (k === 'conductivity') setFormParamName('Toroidal Conductivity Sensor');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ph">pH Level</option>
                    <option value="turbidity">Turbidity (NTU)</option>
                    <option value="dissolvedOxygen">Dissolved Oxygen (DO)</option>
                    <option value="temperature">Temperature (°C)</option>
                    <option value="tds">Total Dissolved Solids (TDS)</option>
                    <option value="conductivity">Electrical Conductivity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    placeholder="e.g. AQ-SN-2026-9041"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Probe Model & Manufacturer
                </label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="e.g. Endress+Hauser Turbimax CUS51D"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
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
                  Register Probe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
