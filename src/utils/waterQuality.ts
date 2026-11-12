/**
 * Water Quality Assessment & Calculation Core Logic
 * Standards supported: EPA Drinking Water Standards, WHO Guidelines, Surface Water
 */

export interface ParameterThreshold {
  minNormal: number;
  maxNormal: number;
  minWarning: number;
  maxWarning: number;
  unit: string;
  name: string;
  description: string;
}

export type WaterParameterKey = 'ph' | 'turbidity' | 'dissolvedOxygen' | 'temperature' | 'tds' | 'conductivity';

export type QualityStatus = 'Normal' | 'Warning' | 'Critical';
export type AlertSeverity = 'Critical' | 'Warning' | 'Informational';

export interface DefaultThresholds {
  ph: ParameterThreshold;
  turbidity: ParameterThreshold;
  dissolvedOxygen: ParameterThreshold;
  temperature: ParameterThreshold;
  tds: ParameterThreshold;
  conductivity: ParameterThreshold;
}

export const DEFAULT_THRESHOLDS: DefaultThresholds = {
  ph: {
    minNormal: 6.5,
    maxNormal: 8.5,
    minWarning: 6.0,
    maxWarning: 9.0,
    unit: 'pH',
    name: 'pH Level',
    description: 'Acidity or alkalinity measure (WHO/EPA safe drinking range: 6.5 - 8.5)',
  },
  turbidity: {
    minNormal: 0.0,
    maxNormal: 5.0,
    minWarning: 0.0,
    maxWarning: 10.0,
    unit: 'NTU',
    name: 'Turbidity',
    description: 'Cloudiness / particulate concentration (EPA limit: < 5 NTU)',
  },
  dissolvedOxygen: {
    minNormal: 6.5,
    maxNormal: 14.0,
    minWarning: 4.5,
    maxWarning: 15.0,
    unit: 'mg/L',
    name: 'Dissolved Oxygen',
    description: 'Free oxygen in water supporting aquatic respiration (min 6.5 mg/L recommended)',
  },
  temperature: {
    minNormal: 10.0,
    maxNormal: 24.0,
    minWarning: 6.0,
    maxWarning: 28.0,
    unit: '°C',
    name: 'Temperature',
    description: 'Water temperature influencing gas solubility & chemical rates',
  },
  tds: {
    minNormal: 50.0,
    maxNormal: 500.0,
    minWarning: 20.0,
    maxWarning: 800.0,
    unit: 'mg/L',
    name: 'Total Dissolved Solids',
    description: 'Combined inorganic and organic substances in molecular form',
  },
  conductivity: {
    minNormal: 100.0,
    maxNormal: 800.0,
    minWarning: 50.0,
    maxWarning: 1200.0,
    unit: 'µS/cm',
    name: 'Electrical Conductivity',
    description: 'Ionic salinity and mineral ion transport capacity',
  },
};

/**
 * Classifies a specific parameter value against configured thresholds
 */
export function evaluateParameterStatus(
  param: WaterParameterKey,
  value: number,
  thresholds: DefaultThresholds = DEFAULT_THRESHOLDS
): QualityStatus {
  const t = thresholds[param];
  if (!t) return 'Normal';

  // Check if within strict normal boundaries
  if (value >= t.minNormal && value <= t.maxNormal) {
    return 'Normal';
  }

  // Check if within warning margins
  if (value >= t.minWarning && value <= t.maxWarning) {
    return 'Warning';
  }

  // Beyond warning boundaries = Critical
  return 'Critical';
}

/**
 * Evaluates overall station health based on all its current parameter statuses
 */
export function determineOverallStationStatus(statuses: QualityStatus[]): QualityStatus {
  if (statuses.includes('Critical')) return 'Critical';
  if (statuses.includes('Warning')) return 'Warning';
  return 'Normal';
}

export interface ParameterReadingMap {
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  temperature: number;
  tds: number;
  conductivity: number;
}

export interface WQIResult {
  score: number; // 0 to 100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor / Critical';
  color: string;
}

/**
 * Calculates standardized Water Quality Index (WQI) based on weighted parameter sub-indices
 */
export function calculateWQI(
  readings: Partial<ParameterReadingMap>,
  thresholds: DefaultThresholds = DEFAULT_THRESHOLDS
): WQIResult {
  const weights: Record<WaterParameterKey, number> = {
    ph: 0.20,
    turbidity: 0.15,
    dissolvedOxygen: 0.25,
    temperature: 0.10,
    tds: 0.15,
    conductivity: 0.15,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const key of Object.keys(weights) as WaterParameterKey[]) {
    const val = readings[key];
    if (val === undefined || isNaN(val)) continue;

    const t = thresholds[key];
    const weight = weights[key];
    let subIndex = 100;

    // Sub-index calculation per parameter
    if (key === 'ph') {
      const ideal = 7.0;
      const deviation = Math.abs(val - ideal);
      subIndex = Math.max(0, 100 - deviation * 25);
    } else if (key === 'dissolvedOxygen') {
      // higher is better up to saturation ~9-11
      if (val >= 7.0) subIndex = 100;
      else if (val >= 5.0) subIndex = 75;
      else if (val >= 3.5) subIndex = 50;
      else subIndex = Math.max(0, val * 10);
    } else if (key === 'turbidity') {
      // lower is better
      if (val <= 1.0) subIndex = 100;
      else if (val <= 5.0) subIndex = 85;
      else if (val <= 10.0) subIndex = 55;
      else subIndex = Math.max(0, 100 - (val - 10) * 8);
    } else if (key === 'temperature') {
      const idealTemp = 18.0;
      const dev = Math.abs(val - idealTemp);
      subIndex = Math.max(0, 100 - dev * 4);
    } else if (key === 'tds') {
      if (val <= 200) subIndex = 100;
      else if (val <= 500) subIndex = 85;
      else subIndex = Math.max(0, 100 - ((val - 500) / 500) * 50);
    } else if (key === 'conductivity') {
      if (val <= 400) subIndex = 100;
      else if (val <= 800) subIndex = 85;
      else subIndex = Math.max(0, 100 - ((val - 800) / 800) * 50);
    }

    subIndex = Math.min(100, Math.max(0, subIndex));
    weightedSum += subIndex * weight;
    totalWeight += weight;
  }

  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  if (finalScore >= 90) return { score: finalScore, rating: 'Excellent', color: '#16A34A' };
  if (finalScore >= 75) return { score: finalScore, rating: 'Good', color: '#2563EB' };
  if (finalScore >= 50) return { score: finalScore, rating: 'Fair', color: '#D97706' };
  if (finalScore >= 35) return { score: finalScore, rating: 'Poor', color: '#EA580C' };
  return { score: finalScore, rating: 'Very Poor / Critical', color: '#DC2626' };
}

/**
 * Checks if an alert should be triggered for a reading, with deduplication key and diagnostic explanation
 */
export function checkThresholdViolation(
  stationId: string,
  stationName: string,
  param: WaterParameterKey,
  value: number,
  thresholds: DefaultThresholds = DEFAULT_THRESHOLDS
): {
  isViolation: boolean;
  severity: AlertSeverity;
  dedupKey: string;
  description: string;
  expectedRange: string;
} | null {
  const status = evaluateParameterStatus(param, value, thresholds);
  if (status === 'Normal') return null;

  const t = thresholds[param];
  const severity: AlertSeverity = status === 'Critical' ? 'Critical' : 'Warning';
  const dedupKey = `${stationId}:${param}:${severity}`;

  let deltaMsg = '';
  if (value < t.minNormal) {
    const delta = (t.minNormal - value).toFixed(2);
    deltaMsg = `${delta} ${t.unit} below minimum safe limit`;
  } else {
    const delta = (value - t.maxNormal).toFixed(2);
    deltaMsg = `${delta} ${t.unit} above maximum safe limit`;
  }

  const description = `${t.name} at ${stationName} is ${value.toFixed(2)} ${t.unit} (${deltaMsg}). Safe standard: ${t.minNormal} - ${t.maxNormal} ${t.unit}.`;
  const expectedRange = `${t.minNormal} - ${t.maxNormal} ${t.unit}`;

  return {
    isViolation: true,
    severity,
    dedupKey,
    description,
    expectedRange,
  };
}
