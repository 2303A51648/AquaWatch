import { DefaultThresholds, QualityStatus, AlertSeverity, WaterParameterKey } from './utils/waterQuality';

export type UserRole = 'Administrator' | 'Monitoring Operator' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  lastLogin: string;
  status: 'Active' | 'Suspended';
}

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
  signalRssi: number;
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

export type ActiveTab =
  | 'dashboard'
  | 'monitoring'
  | 'stations'
  | 'alerts'
  | 'analytics'
  | 'sensors'
  | 'users'
  | 'settings'
  | 'devops';
