import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateParameterStatus,
  determineOverallStationStatus,
  calculateWQI,
  checkThresholdViolation,
  DEFAULT_THRESHOLDS,
} from './waterQuality';

test('pH evaluation classifies normal, warning, and critical values properly', () => {
  // Normal: 6.5 to 8.5
  assert.equal(evaluateParameterStatus('ph', 7.2), 'Normal');
  assert.equal(evaluateParameterStatus('ph', 6.5), 'Normal');
  assert.equal(evaluateParameterStatus('ph', 8.5), 'Normal');

  // Warning: 6.0-6.49 and 8.51-9.0
  assert.equal(evaluateParameterStatus('ph', 6.2), 'Warning');
  assert.equal(evaluateParameterStatus('ph', 8.8), 'Warning');

  // Critical: < 6.0 or > 9.0
  assert.equal(evaluateParameterStatus('ph', 4.5), 'Critical');
  assert.equal(evaluateParameterStatus('ph', 9.5), 'Critical');
});

test('Turbidity evaluation classifies normal, warning, and critical values', () => {
  // Normal: 0 to 5.0 NTU
  assert.equal(evaluateParameterStatus('turbidity', 2.1), 'Normal');
  assert.equal(evaluateParameterStatus('turbidity', 4.9), 'Normal');

  // Warning: 5.1 to 10.0 NTU
  assert.equal(evaluateParameterStatus('turbidity', 7.5), 'Warning');

  // Critical: > 10.0 NTU
  assert.equal(evaluateParameterStatus('turbidity', 18.4), 'Critical');
});

test('Dissolved oxygen classification enforces minimum safe oxygenation', () => {
  // Normal: 6.5 to 14.0 mg/L
  assert.equal(evaluateParameterStatus('dissolvedOxygen', 8.2), 'Normal');

  // Warning: 4.5 to 6.49 mg/L
  assert.equal(evaluateParameterStatus('dissolvedOxygen', 5.5), 'Warning');

  // Critical: < 4.5 mg/L (hypoxia)
  assert.equal(evaluateParameterStatus('dissolvedOxygen', 3.0), 'Critical');
});

test('determineOverallStationStatus prioritizes highest severity', () => {
  assert.equal(determineOverallStationStatus(['Normal', 'Normal', 'Normal']), 'Normal');
  assert.equal(determineOverallStationStatus(['Normal', 'Warning', 'Normal']), 'Warning');
  assert.equal(determineOverallStationStatus(['Normal', 'Warning', 'Critical']), 'Critical');
  assert.equal(determineOverallStationStatus(['Critical', 'Normal']), 'Critical');
});

test('calculateWQI computes high score for pristine water and low for degraded water', () => {
  const pristineReadings = {
    ph: 7.2,
    turbidity: 0.8,
    dissolvedOxygen: 8.5,
    temperature: 18.0,
    tds: 150,
    conductivity: 250,
  };
  const pristineWQI = calculateWQI(pristineReadings);
  assert.ok(pristineWQI.score >= 85, `Pristine score should be >= 85, got ${pristineWQI.score}`);
  assert.match(pristineWQI.rating, /Excellent|Good/);

  const pollutedReadings = {
    ph: 4.2,
    turbidity: 25.0,
    dissolvedOxygen: 2.1,
    temperature: 31.0,
    tds: 950,
    conductivity: 1400,
  };
  const pollutedWQI = calculateWQI(pollutedReadings);
  assert.ok(pollutedWQI.score < 50, `Polluted score should be < 50, got ${pollutedWQI.score}`);
});

test('checkThresholdViolation generates correct alert metadata and dedup key', () => {
  const normalResult = checkThresholdViolation('STN-01', 'Highland Reservoir', 'ph', 7.4);
  assert.equal(normalResult, null);

  const violation = checkThresholdViolation('STN-01', 'Highland Reservoir', 'ph', 5.2);
  assert.ok(violation !== null);
  assert.equal(violation.isViolation, true);
  assert.equal(violation.severity, 'Critical');
  assert.equal(violation.dedupKey, 'STN-01:ph:Critical');
  assert.match(violation.description, /pH Level at Highland Reservoir is 5.20/);
});
