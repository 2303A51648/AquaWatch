import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_THRESHOLDS,
  DefaultThresholds,
  WaterParameterKey,
  evaluateParameterStatus,
  determineOverallStationStatus,
  calculateWQI,
  checkThresholdViolation,
  AlertSeverity,
  QualityStatus,
} from './src/utils/waterQuality.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// --- Legacy in-memory demo data (the deployed API is the FastAPI service) ---

export interface Station {
  id: string;
  name: string;
  code: string;
  location: string;
  coordinates: { lat: number; lng: number };
  waterSourceType: 'River' | 'Reservoir' | 'Lake' | 'Treatment Plant' | 'Estuary' | 'Aquifer';
  capacityMGD: number;
  status: QualityStatus;
  activeSensorsCount: number;
  lastReadingTime: string;
  wqi: number;
  wqiRating: string;
}

export interface SensorRecord {
  id: string;
  stationId: string;
  stationName: string;
  parameterKey: WaterParameterKey;
  parameterName: string;
  serialNumber: string;
  model: string;
  status: 'Active' | 'Calibrating' | 'Maintenance' | 'Inactive';
  batteryPercent: number;
  signalRssi: number; // dBm, e.g. -68
  lastCalibration: string;
  lastCommunication: string;
  firmwareVersion: string;
}

export interface ReadingRecord {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  temperature: number;
  tds: number;
  conductivity: number;
  wqi: number;
  status: QualityStatus;
  isSimulated: boolean;
}

export interface AlertRecord {
  id: string;
  stationId: string;
  stationName: string;
  parameterKey: WaterParameterKey;
  parameterName: string;
  observedValue: number;
  unit: string;
  expectedRange: string;
  severity: AlertSeverity;
  status: 'Active' | 'Acknowledged' | 'Resolved';
  timestamp: string;
  description: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  rootCause?: string;
  dedupKey: string;
  occurrenceCount: number;
}

// Initial Stations
let stations: Station[] = [
  {
    id: 'STN-01',
    code: 'HLD-RES-01',
    name: 'Highland Reservoir Intake',
    location: 'North Ridge Valley, Elevation 640m',
    coordinates: { lat: 37.7833, lng: -122.4167 },
    waterSourceType: 'Reservoir',
    capacityMGD: 45.0,
    status: 'Normal',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 92,
    wqiRating: 'Excellent',
  },
  {
    id: 'STN-02',
    code: 'CLR-CRK-02',
    name: 'Clear Creek Upstream Monitoring',
    location: 'Bear Mountain Tributary, Mile 14',
    coordinates: { lat: 37.8012, lng: -122.4011 },
    waterSourceType: 'River',
    capacityMGD: 22.5,
    status: 'Normal',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 88,
    wqiRating: 'Good',
  },
  {
    id: 'STN-03',
    code: 'IND-CNF-03',
    name: 'Industrial Basin Confluence Point',
    location: 'Lower River Delta, Pier 22',
    coordinates: { lat: 37.7562, lng: -122.3884 },
    waterSourceType: 'River',
    capacityMGD: 18.0,
    status: 'Warning',
    activeSensorsCount: 5,
    lastReadingTime: new Date().toISOString(),
    wqi: 68,
    wqiRating: 'Fair',
  },
  {
    id: 'STN-04',
    code: 'MTR-WTP-04',
    name: 'Metro Filtration Plant #4 Outflow',
    location: 'Central Utility District, Bay 3',
    coordinates: { lat: 37.7421, lng: -122.4342 },
    waterSourceType: 'Treatment Plant',
    capacityMGD: 80.0,
    status: 'Normal',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 95,
    wqiRating: 'Excellent',
  },
  {
    id: 'STN-05',
    code: 'BLU-LKE-05',
    name: 'Blue Lake Recreational Outpost',
    location: 'Pine Point Sanctuary, Shoreline A',
    coordinates: { lat: 37.7289, lng: -122.4789 },
    waterSourceType: 'Lake',
    capacityMGD: 12.0,
    status: 'Normal',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 84,
    wqiRating: 'Good',
  },
  {
    id: 'STN-06',
    code: 'EST-DLT-06',
    name: 'Coastal Estuary Tidal Interface',
    location: 'Ocean Inlet Marshland, Sensor Pod 8',
    coordinates: { lat: 37.7104, lng: -122.5012 },
    waterSourceType: 'Estuary',
    capacityMGD: 30.0,
    status: 'Critical',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 42,
    wqiRating: 'Poor',
  },
];

// Initial Sensors
let sensors: SensorRecord[] = [
  {
    id: 'SNS-101',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'ph',
    parameterName: 'pH Glass Combination Probe',
    serialNumber: 'AQ-PH-2024-8841',
    model: 'YSI Pro10 Glass Potentiometric',
    status: 'Active',
    batteryPercent: 94,
    signalRssi: -58,
    lastCalibration: '2026-10-15',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.4.1',
  },
  {
    id: 'SNS-102',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'turbidity',
    parameterName: 'Nephelometric Turbidity Sensor',
    serialNumber: 'AQ-TB-2024-9122',
    model: 'Hach TU5300 sc Laser Turbidimeter',
    status: 'Active',
    batteryPercent: 92,
    signalRssi: -60,
    lastCalibration: '2026-10-20',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v3.1.0',
  },
  {
    id: 'SNS-103',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'dissolvedOxygen',
    parameterName: 'Optical Dissolved Oxygen Sensor',
    serialNumber: 'AQ-DO-2025-1034',
    model: 'Endress+Hauser Oxymax COS61D',
    status: 'Active',
    batteryPercent: 88,
    signalRssi: -59,
    lastCalibration: '2026-10-28',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.8.4',
  },
  {
    id: 'SNS-104',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'temperature',
    parameterName: 'High-Precision PT100 Digital Temp',
    serialNumber: 'AQ-TM-2024-3490',
    model: 'Omega RTD Industrial Immersion',
    status: 'Active',
    batteryPercent: 96,
    signalRssi: -55,
    lastCalibration: '2026-09-12',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v1.9.0',
  },
  {
    id: 'SNS-105',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'tds',
    parameterName: 'Total Dissolved Solids Probe',
    serialNumber: 'AQ-TDS-2024-7711',
    model: 'Sensorex CS300 Conductivity/TDS',
    status: 'Active',
    batteryPercent: 89,
    signalRssi: -62,
    lastCalibration: '2026-10-02',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.2.0',
  },
  {
    id: 'SNS-106',
    stationId: 'STN-01',
    stationName: 'Highland Reservoir Intake',
    parameterKey: 'conductivity',
    parameterName: 'Inductive Toroidal EC Sensor',
    serialNumber: 'AQ-EC-2025-5541',
    model: 'Rosemount 228 Toroidal Sensor',
    status: 'Active',
    batteryPercent: 91,
    signalRssi: -61,
    lastCalibration: '2026-10-18',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.6.2',
  },
  // Key sensors for STN-03
  {
    id: 'SNS-301',
    stationId: 'STN-03',
    stationName: 'Industrial Basin Confluence Point',
    parameterKey: 'ph',
    parameterName: 'pH Differential Electrode',
    serialNumber: 'AQ-PH-2024-4112',
    model: 'Hach pHD Differential',
    status: 'Active',
    batteryPercent: 78,
    signalRssi: -74,
    lastCalibration: '2026-09-20',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.4.1',
  },
  {
    id: 'SNS-302',
    stationId: 'STN-03',
    stationName: 'Industrial Basin Confluence Point',
    parameterKey: 'turbidity',
    parameterName: 'Surface Scatter Turbidimeter',
    serialNumber: 'AQ-TB-2024-8890',
    model: 'Hach SS6 Optical',
    status: 'Active',
    batteryPercent: 64,
    signalRssi: -76,
    lastCalibration: '2026-08-14',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v3.0.1',
  },
  {
    id: 'SNS-303',
    stationId: 'STN-03',
    stationName: 'Industrial Basin Confluence Point',
    parameterKey: 'dissolvedOxygen',
    parameterName: 'Luminescent DO Cap Sensor',
    serialNumber: 'AQ-DO-2024-6621',
    model: 'In-Situ RDO PRO-X Optical',
    status: 'Active',
    batteryPercent: 72,
    signalRssi: -72,
    lastCalibration: '2026-09-01',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.8.4',
  },
  // Estuary sensors
  {
    id: 'SNS-601',
    stationId: 'STN-06',
    stationName: 'Coastal Estuary Tidal Interface',
    parameterKey: 'turbidity',
    parameterName: 'Deep Water Turbidity Scanner',
    serialNumber: 'AQ-TB-2025-0044',
    model: 'WetLabs ECO-NTU Fluorometer',
    status: 'Active',
    batteryPercent: 55,
    signalRssi: -82,
    lastCalibration: '2026-07-22',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v3.1.2',
  },
  {
    id: 'SNS-602',
    stationId: 'STN-06',
    stationName: 'Coastal Estuary Tidal Interface',
    parameterKey: 'dissolvedOxygen',
    parameterName: 'Hypoxia Emergency Luminescent DO',
    serialNumber: 'AQ-DO-2025-9923',
    model: 'Aanderaa Optode 4835',
    status: 'Active',
    batteryPercent: 49,
    signalRssi: -84,
    lastCalibration: '2026-08-11',
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v2.9.0',
  },
];

let activeThresholds: DefaultThresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));

// Seed Historical Readings
let readingsHistory: ReadingRecord[] = [];
let activeAlerts: AlertRecord[] = [];

// Seed 24 hours of 1-hour interval historical data for all stations
function initializeHistoricalData() {
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600 * 1000).toISOString();

    stations.forEach((stn) => {
      let ph = 7.2;
      let turbidity = 1.4;
      let doVal = 8.8;
      let temp = 17.5;
      let tds = 140;
      let ec = 260;

      if (stn.id === 'STN-01') {
        // Highland reservoir - very clean
        ph = 7.3 + Math.sin(i / 3) * 0.2;
        turbidity = 1.2 + Math.cos(i / 4) * 0.4;
        doVal = 9.1 + Math.sin(i / 5) * 0.3;
        temp = 16.8 + Math.cos(i / 6) * 1.2;
        tds = 135 + Math.sin(i) * 15;
        ec = 240 + Math.sin(i) * 20;
      } else if (stn.id === 'STN-02') {
        // Clear creek
        ph = 7.1 + Math.sin(i / 4) * 0.3;
        turbidity = 2.4 + Math.sin(i / 2) * 0.8;
        doVal = 8.5 + Math.cos(i / 3) * 0.4;
        temp = 15.5 + Math.sin(i / 5) * 1.5;
        tds = 165 + Math.cos(i) * 20;
        ec = 280 + Math.sin(i) * 25;
      } else if (stn.id === 'STN-03') {
        // Industrial confluence - moderate turbidity / elevated TDS
        ph = 6.4 + Math.sin(i / 3) * 0.4;
        turbidity = 6.8 + Math.sin(i / 2) * 1.5;
        doVal = 5.8 + Math.cos(i / 3) * 0.6;
        temp = 21.2 + Math.sin(i / 4) * 1.8;
        tds = 560 + Math.sin(i / 2) * 60;
        ec = 880 + Math.sin(i / 2) * 80;
      } else if (stn.id === 'STN-04') {
        // Treatment plant outflow - highly controlled
        ph = 7.4 + Math.sin(i / 6) * 0.1;
        turbidity = 0.6 + Math.cos(i / 5) * 0.2;
        doVal = 9.6 + Math.sin(i / 4) * 0.2;
        temp = 18.2 + Math.cos(i / 6) * 0.5;
        tds = 110 + Math.sin(i / 4) * 10;
        ec = 195 + Math.sin(i / 4) * 12;
      } else if (stn.id === 'STN-05') {
        // Blue Lake
        ph = 7.8 + Math.sin(i / 4) * 0.3;
        turbidity = 3.2 + Math.sin(i / 3) * 0.6;
        doVal = 7.9 + Math.cos(i / 5) * 0.4;
        temp = 20.1 + Math.sin(i / 4) * 1.2;
        tds = 220 + Math.sin(i / 3) * 25;
        ec = 340 + Math.sin(i / 3) * 35;
      } else if (stn.id === 'STN-06') {
        // Estuary - low DO (hypoxia event) & elevated turbidity
        ph = 8.7 + Math.sin(i / 3) * 0.4;
        turbidity = 14.5 + Math.sin(i / 2) * 3.5;
        doVal = 3.8 + Math.cos(i / 4) * 0.5;
        temp = 22.5 + Math.sin(i / 5) * 1.2;
        tds = 780 + Math.sin(i / 3) * 90;
        ec = 1180 + Math.sin(i / 3) * 110;
      }

      const pStatus: QualityStatus[] = [
        evaluateParameterStatus('ph', ph, activeThresholds),
        evaluateParameterStatus('turbidity', turbidity, activeThresholds),
        evaluateParameterStatus('dissolvedOxygen', doVal, activeThresholds),
        evaluateParameterStatus('temperature', temp, activeThresholds),
        evaluateParameterStatus('tds', tds, activeThresholds),
        evaluateParameterStatus('conductivity', ec, activeThresholds),
      ];

      const overall = determineOverallStationStatus(pStatus);
      const wqiObj = calculateWQI(
        { ph, turbidity, dissolvedOxygen: doVal, temperature: temp, tds, conductivity: ec },
        activeThresholds
      );

      readingsHistory.push({
        id: `RDG-${stn.id}-${i}`,
        stationId: stn.id,
        stationName: stn.name,
        timestamp,
        ph: Number(ph.toFixed(2)),
        turbidity: Number(turbidity.toFixed(2)),
        dissolvedOxygen: Number(doVal.toFixed(2)),
        temperature: Number(temp.toFixed(1)),
        tds: Math.round(tds),
        conductivity: Math.round(ec),
        wqi: wqiObj.score,
        status: overall,
        isSimulated: true,
      });

      if (i === 0) {
        stn.status = overall;
        stn.wqi = wqiObj.score;
        stn.wqiRating = wqiObj.rating;
        stn.lastReadingTime = timestamp;
      }
    });
  }

  // Pre-seed 3 realistic alert records for demonstration
  activeAlerts = [
    {
      id: 'ALT-1001',
      stationId: 'STN-06',
      stationName: 'Coastal Estuary Tidal Interface',
      parameterKey: 'dissolvedOxygen',
      parameterName: 'Dissolved Oxygen',
      observedValue: 3.8,
      unit: 'mg/L',
      expectedRange: '6.5 - 14.0 mg/L',
      severity: 'Critical',
      status: 'Active',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      description: 'Hypoxic conditions detected: Dissolved Oxygen dropped to 3.8 mg/L (2.70 mg/L below minimum safe threshold). Severe risk of aquatic asphyxiation.',
      dedupKey: 'STN-06:dissolvedOxygen:Critical',
      occurrenceCount: 12,
    },
    {
      id: 'ALT-1002',
      stationId: 'STN-06',
      stationName: 'Coastal Estuary Tidal Interface',
      parameterKey: 'turbidity',
      parameterName: 'Turbidity',
      observedValue: 14.5,
      unit: 'NTU',
      expectedRange: '0.0 - 5.0 NTU',
      severity: 'Critical',
      status: 'Active',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      description: 'Severe turbidity spike: Suspended sediment measured at 14.5 NTU (exceeds critical maximum 10.0 NTU). Upstream tidal dredging suspected.',
      dedupKey: 'STN-06:turbidity:Critical',
      occurrenceCount: 8,
    },
    {
      id: 'ALT-1003',
      stationId: 'STN-03',
      stationName: 'Industrial Basin Confluence Point',
      parameterKey: 'turbidity',
      parameterName: 'Turbidity',
      observedValue: 6.8,
      unit: 'NTU',
      expectedRange: '0.0 - 5.0 NTU',
      severity: 'Warning',
      status: 'Acknowledged',
      timestamp: new Date(now - 120 * 60 * 1000).toISOString(),
      acknowledgedBy: 'Marcus Vance (Monitoring Operator)',
      acknowledgedAt: new Date(now - 90 * 60 * 1000).toISOString(),
      description: 'Turbidity approaching upper safety ceiling at 6.8 NTU. Secondary runoff filters alerted.',
      dedupKey: 'STN-03:turbidity:Warning',
      occurrenceCount: 18,
    },
  ];
}

initializeHistoricalData();

// --- Real-time Sensor Simulator Engine ---
interface AnomalyInjection {
  stationId: string;
  parameterKey: WaterParameterKey;
  anomalyType: 'acid_spill' | 'turbidity_storm' | 'hypoxia_drop' | 'saline_surge';
  severity: AlertSeverity;
  targetValue: number;
  durationMs: number;
  startedAt: number;
}

let isSimulatorRunning = true;
let simulationIntervalMs = 4000;
let currentAnomaly: AnomalyInjection | null = null;

function runSimulationStep() {
  if (!isSimulatorRunning) return;

  const timestamp = new Date().toISOString();
  const now = Date.now();

  // Check if anomaly expired
  if (currentAnomaly && now - currentAnomaly.startedAt > currentAnomaly.durationMs) {
    currentAnomaly = null;
  }

  stations.forEach((stn) => {
    // Look up latest reading
    const recent = readingsHistory
      .filter((r) => r.stationId === stn.id)
      .slice(-1)[0];

    // Jitter around previous reading
    let ph = recent ? recent.ph + (Math.random() - 0.5) * 0.08 : 7.2;
    let turbidity = recent ? Math.max(0.2, recent.turbidity + (Math.random() - 0.5) * 0.25) : 1.5;
    let dissolvedOxygen = recent ? Math.max(1.0, recent.dissolvedOxygen + (Math.random() - 0.5) * 0.15) : 8.5;
    let temperature = recent ? recent.temperature + (Math.random() - 0.5) * 0.1 : 18.0;
    let tds = recent ? Math.max(30, recent.tds + (Math.random() - 0.5) * 4) : 180;
    let conductivity = recent ? Math.max(50, recent.conductivity + (Math.random() - 0.5) * 6) : 280;

    // Apply active anomaly injection if targeting this station
    if (currentAnomaly && currentAnomaly.stationId === stn.id) {
      if (currentAnomaly.parameterKey === 'ph') ph = currentAnomaly.targetValue + (Math.random() - 0.5) * 0.1;
      if (currentAnomaly.parameterKey === 'turbidity') turbidity = currentAnomaly.targetValue + (Math.random() - 0.5) * 0.5;
      if (currentAnomaly.parameterKey === 'dissolvedOxygen') dissolvedOxygen = currentAnomaly.targetValue + (Math.random() - 0.5) * 0.2;
      if (currentAnomaly.parameterKey === 'tds') tds = currentAnomaly.targetValue + (Math.random() - 0.5) * 10;
      if (currentAnomaly.parameterKey === 'conductivity') conductivity = currentAnomaly.targetValue + (Math.random() - 0.5) * 20;
    }

    const parameterStatusList: QualityStatus[] = [
      evaluateParameterStatus('ph', ph, activeThresholds),
      evaluateParameterStatus('turbidity', turbidity, activeThresholds),
      evaluateParameterStatus('dissolvedOxygen', dissolvedOxygen, activeThresholds),
      evaluateParameterStatus('temperature', temperature, activeThresholds),
      evaluateParameterStatus('tds', tds, activeThresholds),
      evaluateParameterStatus('conductivity', conductivity, activeThresholds),
    ];

    const overall = determineOverallStationStatus(parameterStatusList);
    const wqi = calculateWQI(
      { ph, turbidity, dissolvedOxygen, temperature, tds, conductivity },
      activeThresholds
    );

    // Update station state
    stn.status = overall;
    stn.wqi = wqi.score;
    stn.wqiRating = wqi.rating;
    stn.lastReadingTime = timestamp;

    const newReading: ReadingRecord = {
      id: `RDG-${stn.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      stationId: stn.id,
      stationName: stn.name,
      timestamp,
      ph: Number(ph.toFixed(2)),
      turbidity: Number(turbidity.toFixed(2)),
      dissolvedOxygen: Number(dissolvedOxygen.toFixed(2)),
      temperature: Number(temperature.toFixed(1)),
      tds: Math.round(tds),
      conductivity: Math.round(conductivity),
      wqi: wqi.score,
      status: overall,
      isSimulated: true,
    };

    readingsHistory.push(newReading);

    // Keep history buffer capped at 500 records to prevent memory growth
    if (readingsHistory.length > 500) {
      readingsHistory.splice(0, readingsHistory.length - 500);
    }

    // Evaluate alerts and deduplicate
    const paramsToCheck: { key: WaterParameterKey; val: number }[] = [
      { key: 'ph', val: ph },
      { key: 'turbidity', val: turbidity },
      { key: 'dissolvedOxygen', val: dissolvedOxygen },
      { key: 'temperature', val: temperature },
      { key: 'tds', val: tds },
      { key: 'conductivity', val: conductivity },
    ];

    paramsToCheck.forEach(({ key, val }) => {
      const violation = checkThresholdViolation(stn.id, stn.name, key, val, activeThresholds);
      if (violation) {
        const existingAlertIndex = activeAlerts.findIndex(
          (a) => a.dedupKey === violation.dedupKey && a.status !== 'Resolved'
        );

        if (existingAlertIndex >= 0) {
          // Increment count and update value without spamming separate rows
          const existing = activeAlerts[existingAlertIndex];
          existing.observedValue = Number(val.toFixed(2));
          existing.timestamp = timestamp;
          existing.occurrenceCount += 1;
        } else {
          // Create new alert
          const newAlert: AlertRecord = {
            id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            stationId: stn.id,
            stationName: stn.name,
            parameterKey: key,
            parameterName: activeThresholds[key].name,
            observedValue: Number(val.toFixed(2)),
            unit: activeThresholds[key].unit,
            expectedRange: violation.expectedRange,
            severity: violation.severity,
            status: 'Active',
            timestamp,
            description: violation.description,
            dedupKey: violation.dedupKey,
            occurrenceCount: 1,
          };
          activeAlerts.unshift(newAlert);
          if (activeAlerts.length > 100) {
            activeAlerts.pop();
          }
        }
      }
    });
  });
}

// Start simulation loop
setInterval(runSimulationStep, simulationIntervalMs);

// --- API Endpoints ---

// Health & readiness probes for the standalone demo server
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'aquawatch-core-engine',
    version: '1.0.0',
    mode: 'in-cluster-simulation',
  });
});

app.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    database: 'in-memory demo data',
    stationsTracked: stations.length,
    activeSensors: sensors.filter((s) => s.status === 'Active').length,
    simulatorStatus: isSimulatorRunning ? 'active' : 'paused',
  });
});

// Stations API
app.get('/api/stations', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: stations,
    meta: {
      total: stations.length,
      normalCount: stations.filter((s) => s.status === 'Normal').length,
      warningCount: stations.filter((s) => s.status === 'Warning').length,
      criticalCount: stations.filter((s) => s.status === 'Critical').length,
      isSimulated: true,
    },
  });
});

app.get('/api/stations/:id', (req: Request, res: Response) => {
  const station = stations.find((s) => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ success: false, error: 'Station not found' });
  }

  const stationSensors = sensors.filter((s) => s.stationId === station.id);
  const recentReadings = readingsHistory
    .filter((r) => r.stationId === station.id)
    .slice(-30);
  const stationAlerts = activeAlerts.filter((a) => a.stationId === station.id);

  res.json({
    success: true,
    data: {
      station,
      sensors: stationSensors,
      recentReadings,
      alerts: stationAlerts,
    },
  });
});

app.post('/api/stations', (req: Request, res: Response) => {
  const { name, code, location, waterSourceType, capacityMGD, lat, lng } = req.body;
  if (!name || !waterSourceType) {
    return res.status(400).json({ success: false, error: 'Missing required station attributes' });
  }

  const newStation: Station = {
    id: `STN-${String(stations.length + 1).padStart(2, '0')}`,
    code: code || `STN-${Date.now().toString(36).toUpperCase()}`,
    name,
    location: location || 'Regional Watershed Grid',
    coordinates: {
      lat: parseFloat(lat) || 37.75,
      lng: parseFloat(lng) || -122.42,
    },
    waterSourceType,
    capacityMGD: parseFloat(capacityMGD) || 15.0,
    status: 'Normal',
    activeSensorsCount: 6,
    lastReadingTime: new Date().toISOString(),
    wqi: 88,
    wqiRating: 'Good',
  };

  stations.push(newStation);
  res.status(201).json({ success: true, data: newStation });
});

app.put('/api/stations/:id', (req: Request, res: Response) => {
  const station = stations.find((s) => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ success: false, error: 'Station not found' });
  }
  Object.assign(station, req.body);
  res.json({ success: true, data: station });
});

// Sensors API
app.get('/api/sensors', (req: Request, res: Response) => {
  const { stationId, status } = req.query;
  let filtered = [...sensors];
  if (stationId) filtered = filtered.filter((s) => s.stationId === stationId);
  if (status) filtered = filtered.filter((s) => s.status === status);
  res.json({ success: true, data: filtered, total: filtered.length });
});

app.post('/api/sensors', (req: Request, res: Response) => {
  const { stationId, parameterKey, parameterName, model, serialNumber } = req.body;
  const targetStation = stations.find((s) => s.id === stationId);

  const newSensor: SensorRecord = {
    id: `SNS-${Date.now().toString(36).toUpperCase()}`,
    stationId: stationId || stations[0].id,
    stationName: targetStation ? targetStation.name : 'Unassigned',
    parameterKey: parameterKey || 'ph',
    parameterName: parameterName || 'Custom Multi-Probe',
    serialNumber: serialNumber || `AQ-SN-${Date.now().toString(36)}`,
    model: model || 'Enterprise Digital Sensor',
    status: 'Active',
    batteryPercent: 100,
    signalRssi: -58,
    lastCalibration: new Date().toISOString().split('T')[0],
    lastCommunication: new Date().toISOString(),
    firmwareVersion: 'v3.0.0',
  };

  sensors.push(newSensor);
  res.status(201).json({ success: true, data: newSensor });
});

app.put('/api/sensors/:id', (req: Request, res: Response) => {
  const sensor = sensors.find((s) => s.id === req.params.id);
  if (!sensor) {
    return res.status(404).json({ success: false, error: 'Sensor not found' });
  }
  Object.assign(sensor, req.body);
  res.json({ success: true, data: sensor });
});

// Readings API
app.get('/api/readings/latest', (req: Request, res: Response) => {
  const latestPerStation = stations.map((stn) => {
    const latest = readingsHistory
      .filter((r) => r.stationId === stn.id)
      .slice(-1)[0];
    return {
      station: stn,
      reading: latest || null,
    };
  });

  res.json({
    success: true,
    data: latestPerStation,
    isSimulated: true,
    disclaimer: 'SIMULATED DATA: Environmental sensor readings generated by AquaWatch Simulation Engine.',
  });
});

app.get('/api/readings/history', (req: Request, res: Response) => {
  const { stationId, limit } = req.query;
  let records = [...readingsHistory];
  if (stationId) {
    records = records.filter((r) => r.stationId === stationId);
  }
  const maxRecords = limit ? parseInt(limit as string) : 60;
  records = records.slice(-maxRecords);
  res.json({ success: true, data: records, count: records.length });
});

// Alerts API
app.get('/api/alerts', (req: Request, res: Response) => {
  const { status, severity, stationId } = req.query;
  let filtered = [...activeAlerts];
  if (status && status !== 'all') filtered = filtered.filter((a) => a.status.toLowerCase() === (status as string).toLowerCase());
  if (severity && severity !== 'all') filtered = filtered.filter((a) => a.severity.toLowerCase() === (severity as string).toLowerCase());
  if (stationId && stationId !== 'all') filtered = filtered.filter((a) => a.stationId === stationId);

  res.json({
    success: true,
    data: filtered,
    total: filtered.length,
    activeCount: activeAlerts.filter((a) => a.status === 'Active').length,
    acknowledgedCount: activeAlerts.filter((a) => a.status === 'Acknowledged').length,
    resolvedCount: activeAlerts.filter((a) => a.status === 'Resolved').length,
    criticalCount: activeAlerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length,
  });
});

app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const { userName } = req.body;
  const alert = activeAlerts.find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

  alert.status = 'Acknowledged';
  alert.acknowledgedBy = userName || 'Operator';
  alert.acknowledgedAt = new Date().toISOString();

  res.json({ success: true, data: alert });
});

app.post('/api/alerts/:id/resolve', (req: Request, res: Response) => {
  const { userName, rootCause, resolutionNotes } = req.body;
  const alert = activeAlerts.find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

  alert.status = 'Resolved';
  alert.resolvedBy = userName || 'Sarah Chen (Administrator)';
  alert.resolvedAt = new Date().toISOString();
  alert.rootCause = rootCause || 'Corrective aeration & chemical neutralization completed';
  alert.resolutionNotes = resolutionNotes || 'Water quality parameters verified within normal standard limits.';

  res.json({ success: true, data: alert });
});

// Thresholds API
app.get('/api/thresholds', (req: Request, res: Response) => {
  res.json({ success: true, data: activeThresholds });
});

app.put('/api/thresholds', (req: Request, res: Response) => {
  const updated = req.body;
  activeThresholds = { ...activeThresholds, ...updated };
  res.json({ success: true, data: activeThresholds });
});

// Simulation Controls API
app.post('/api/simulation/toggle', (req: Request, res: Response) => {
  isSimulatorRunning = !isSimulatorRunning;
  res.json({ success: true, isRunning: isSimulatorRunning });
});

app.post('/api/simulation/inject-anomaly', (req: Request, res: Response) => {
  const { stationId, anomalyType } = req.body;
  const targetStation = stations.find((s) => s.id === stationId) || stations[0];

  let param: WaterParameterKey = 'ph';
  let targetVal = 4.2; // acid spill
  let sev: AlertSeverity = 'Critical';

  if (anomalyType === 'acid_spill') {
    param = 'ph';
    targetVal = 4.1;
    sev = 'Critical';
  } else if (anomalyType === 'turbidity_storm') {
    param = 'turbidity';
    targetVal = 24.5;
    sev = 'Critical';
  } else if (anomalyType === 'hypoxia_drop') {
    param = 'dissolvedOxygen';
    targetVal = 2.4;
    sev = 'Critical';
  } else if (anomalyType === 'saline_surge') {
    param = 'tds';
    targetVal = 920;
    sev = 'Warning';
  }

  currentAnomaly = {
    stationId: targetStation.id,
    parameterKey: param,
    anomalyType,
    severity: sev,
    targetValue: targetVal,
    durationMs: 45000, // 45 seconds anomaly
    startedAt: Date.now(),
  };

  // Run immediate step
  runSimulationStep();

  res.json({
    success: true,
    message: `Simulated anomaly '${anomalyType}' injected at ${targetStation.name} on ${param}.`,
    anomaly: currentAnomaly,
  });
});

app.post('/api/simulation/reset', (req: Request, res: Response) => {
  currentAnomaly = null;
  activeThresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  initializeHistoricalData();
  res.json({ success: true, message: 'Simulation and telemetry reset to pristine baseline.' });
});

// Reports & CSV Export API
app.get('/api/reports/summary', (req: Request, res: Response) => {
  const totalReadings = readingsHistory.length;
  const criticalReadings = readingsHistory.filter((r) => r.status === 'Critical').length;
  const warningReadings = readingsHistory.filter((r) => r.status === 'Warning').length;
  const normalReadings = readingsHistory.filter((r) => r.status === 'Normal').length;

  const complianceRate = totalReadings > 0
    ? (((normalReadings + warningReadings * 0.7) / totalReadings) * 100).toFixed(1)
    : '100.0';

  res.json({
    success: true,
    data: {
      totalReadings,
      normalCount: normalReadings,
      warningCount: warningReadings,
      criticalCount: criticalReadings,
      complianceRate: parseFloat(complianceRate),
      totalAlerts: activeAlerts.length,
      activeAlertsCount: activeAlerts.filter((a) => a.status === 'Active').length,
      stationsMonitored: stations.length,
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/api/reports/export-csv', (req: Request, res: Response) => {
  const headers = [
    'Reading_ID',
    'Station_ID',
    'Station_Name',
    'Timestamp_UTC',
    'pH',
    'Turbidity_NTU',
    'Dissolved_Oxygen_mgL',
    'Temperature_C',
    'TDS_mgL',
    'Conductivity_uScm',
    'WQI_Score',
    'Overall_Status',
    'Data_Type',
  ];

  const rows = readingsHistory.map((r) => [
    r.id,
    r.stationId,
    `"${r.stationName}"`,
    r.timestamp,
    r.ph,
    r.turbidity,
    r.dissolvedOxygen,
    r.temperature,
    r.tds,
    r.conductivity,
    r.wqi,
    r.status,
    'SIMULATED_TELEMETRY',
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="aquawatch_water_quality_telemetry.csv"');
  res.send(csv);
});

// Users / Auth
app.get('/api/users', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
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
    ],
  });
});

// Serve Frontend via Vite dev middleware or static dist
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AquaWatch] Full-Stack Server active on http://0.0.0.0:${PORT}`);
    console.log(`[AquaWatch] Live simulator running at ${simulationIntervalMs}ms intervals`);
  });
}

startServer();
