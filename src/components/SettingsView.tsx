import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Bell,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DefaultThresholds, DEFAULT_THRESHOLDS, WaterParameterKey } from '../utils/waterQuality';
import { UserRole } from '../types';

interface SettingsViewProps {
  thresholds: DefaultThresholds;
  onUpdateThresholds: (newThresholds: DefaultThresholds) => void;
  currentRole: UserRole;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  thresholds,
  onUpdateThresholds,
  currentRole,
}) => {
  const [localThresholds, setLocalThresholds] = useState<DefaultThresholds>(
    JSON.parse(JSON.stringify(thresholds))
  );
  const [activePreset, setActivePreset] = useState<'epa' | 'who' | 'surface' | 'aquaculture'>('epa');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Preset standards definitions
  const applyPreset = (preset: 'epa' | 'who' | 'surface' | 'aquaculture') => {
    setActivePreset(preset);
    let updated = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));

    if (preset === 'who') {
      updated.ph.minNormal = 6.5;
      updated.ph.maxNormal = 8.5;
      updated.turbidity.maxNormal = 4.0;
      updated.tds.maxNormal = 600;
    } else if (preset === 'surface') {
      updated.ph.minNormal = 6.0;
      updated.ph.maxNormal = 9.0;
      updated.turbidity.maxNormal = 10.0;
      updated.dissolvedOxygen.minNormal = 5.0;
    } else if (preset === 'aquaculture') {
      updated.ph.minNormal = 7.0;
      updated.ph.maxNormal = 8.2;
      updated.dissolvedOxygen.minNormal = 7.0;
      updated.temperature.minNormal = 14.0;
      updated.temperature.maxNormal = 22.0;
    }

    setLocalThresholds(updated);
  };

  const handleSave = () => {
    onUpdateThresholds(localThresholds);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const handleReset = () => {
    setLocalThresholds(JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)));
    setActivePreset('epa');
  };

  const canEdit = currentRole === 'Administrator';

  const updateParam = (param: WaterParameterKey, field: string, val: number) => {
    setLocalThresholds((prev) => ({
      ...prev,
      [param]: {
        ...prev[param],
        [field]: val,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#102A43] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#168AAD]" />
            <span>Water Quality Standards & System Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calibrate safety threshold margins, regulatory compliance baselines, and dispatch protocols.
          </p>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standards</span>
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#168AAD] hover:bg-[#126d87] text-white flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
            Read-Only: Administrator permissions required to edit thresholds.
          </div>
        )}
      </div>

      {isSavedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Threshold configuration updated successfully. Sensor ingestion engine recalibrated.</span>
        </div>
      )}

      {/* Regulatory Standards Presets */}
      <div className="bg-white dark:bg-[#102A43] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          Regulatory Standard Presets
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Select an international guideline to automatically populate standard threshold envelopes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'epa',
              title: 'EPA Clean Water Act',
              desc: 'Primary Drinking Water & Municipal Intake standards (US EPA)',
            },
            {
              id: 'who',
              title: 'WHO Guidelines',
              desc: 'World Health Organization Potable Water Reference Standard',
            },
            {
              id: 'surface',
              title: 'Surface Water Class A',
              desc: 'Natural Rivers, Lakes & Watershed Ecological Protection Limits',
            },
            {
              id: 'aquaculture',
              title: 'Aquaculture Sanctuary',
              desc: 'High-oxygen sensitive aquatic species & fish spawning grounds',
            },
          ].map((preset) => (
            <button
              key={preset.id}
              disabled={!canEdit}
              onClick={() => applyPreset(preset.id as any)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activePreset === preset.id
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-slate-800 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-slate-300'
              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                {preset.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                {preset.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Bounds Editor */}
      <div className="bg-white dark:bg-[#102A43] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Parameter Classification Limits & Threshold Matrix
        </h3>

        <div className="space-y-4">
          {(Object.keys(localThresholds) as WaterParameterKey[]).map((key) => {
            const p = localThresholds[key];

            return (
              <div
                key={key}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                    <p className="text-[11px] text-slate-400">{p.description}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#168AAD]">
                    Unit: {p.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mb-1">
                      Min Normal (Safe)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      value={p.minNormal}
                      onChange={(e) => updateParam(key, 'minNormal', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mb-1">
                      Max Normal (Safe)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      value={p.maxNormal}
                      onChange={(e) => updateParam(key, 'maxNormal', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-amber-700 dark:text-amber-400 mb-1">
                      Min Warning Limit
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      value={p.minWarning}
                      onChange={(e) => updateParam(key, 'minWarning', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-amber-700 dark:text-amber-400 mb-1">
                      Max Warning Limit
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      value={p.maxWarning}
                      onChange={(e) => updateParam(key, 'maxWarning', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
