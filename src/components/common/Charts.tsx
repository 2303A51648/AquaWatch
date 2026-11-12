import React, { useState } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  min?: number;
  max?: number;
}

export const MiniSparkline: React.FC<SparklineProps> = ({
  data,
  color = '#168AAD',
  height = 36,
  width = 110,
  min,
  max,
}) => {
  if (!data || data.length < 2) {
    return <div style={{ height, width }} className="flex items-center justify-center text-xs text-slate-400">--</div>;
  }

  const effectiveMin = min !== undefined ? min : Math.min(...data);
  const effectiveMax = max !== undefined ? max : Math.max(...data);
  const range = effectiveMax - effectiveMin || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((val - effectiveMin) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface GaugeChartProps {
  value: number;
  minNormal: number;
  maxNormal: number;
  minScale: number;
  maxScale: number;
  unit: string;
  status: 'Normal' | 'Warning' | 'Critical';
  size?: number;
}

export const CircularGauge: React.FC<GaugeChartProps> = ({
  value,
  minNormal,
  maxNormal,
  minScale,
  maxScale,
  unit,
  status,
  size = 130,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;

  const clamped = Math.max(minScale, Math.min(maxScale, value));
  const fraction = (clamped - minScale) / (maxScale - minScale || 1);
  const currentAngle = startAngle + fraction * angleRange;

  // Arc path generator
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const statusColor =
    status === 'Critical' ? '#DC2626' : status === 'Warning' ? '#D97706' : '#16A34A';

  // Calculate acceptable zone angles
  const normalStartFrac = Math.max(0, Math.min(1, (minNormal - minScale) / (maxScale - minScale)));
  const normalEndFrac = Math.max(0, Math.min(1, (maxNormal - minScale) / (maxScale - minScale)));
  const normalStartAngle = startAngle + normalStartFrac * angleRange;
  const normalEndAngle = startAngle + normalEndFrac * angleRange;

  const bgPath = describeArc(center, center, radius, startAngle, endAngle);
  const normalBandPath = describeArc(center, center, radius, normalStartAngle, normalEndAngle);
  const valuePath = describeArc(center, center, radius, startAngle, currentAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.9}`} className="overflow-visible">
        {/* Track */}
        <path
          d={bgPath}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700/60"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Safe Normal Envelope Green Zone */}
        <path
          d={normalBandPath}
          fill="none"
          stroke="#22C55E"
          strokeOpacity="0.4"
          strokeWidth={strokeWidth + 2}
        />
        {/* Current Value Active Arc */}
        <path
          d={valuePath}
          fill="none"
          stroke={statusColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        {/* Center Text */}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="font-mono text-xl font-bold fill-slate-800 dark:fill-slate-100"
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          className="text-[11px] font-medium fill-slate-500 dark:fill-slate-400"
        >
          {unit}
        </text>
      </svg>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 -mt-1">
        <span>Safe:</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {minNormal}–{maxNormal} {unit}
        </span>
      </div>
    </div>
  );
};

interface TimeSeriesChartProps {
  data: {
    timestamp: string;
    value: number;
    label?: string;
  }[];
  minNormal?: number;
  maxNormal?: number;
  unit: string;
  title: string;
  color?: string;
  height?: number;
}

export const InteractiveTimeSeries: React.FC<TimeSeriesChartProps> = ({
  data,
  minNormal,
  maxNormal,
  unit,
  title,
  color = '#168AAD',
  height = 240,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-400 text-sm">
        No telemetry records available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  if (minNormal !== undefined) minVal = Math.min(minVal, minNormal * 0.9);
  if (maxNormal !== undefined) maxVal = Math.max(maxVal, maxNormal * 1.1);

  const range = maxVal - minVal || 1;
  const paddingX = 45;
  const paddingY = 25;
  const width = 720;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * plotWidth;
    const y = paddingY + plotHeight - ((d.value - minVal) / range) * plotHeight;
    return { x, y, value: d.value, timestamp: d.timestamp };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M ${points[0].x},${paddingY + plotHeight} L ${polylineStr} L ${
    points[points.length - 1].x
  },${paddingY + plotHeight} Z`;

  // Normal zone band
  let normalY1 = paddingY;
  let normalY2 = paddingY + plotHeight;
  if (minNormal !== undefined && maxNormal !== undefined) {
    normalY1 = paddingY + plotHeight - ((maxNormal - minVal) / range) * plotHeight;
    normalY2 = paddingY + plotHeight - ((minNormal - minVal) / range) * plotHeight;
  }

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
        {hoveredPoint && (
          <div className="text-xs font-mono bg-slate-900 text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-2">
            <span>{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</span>
            <span className="font-bold text-cyan-300">
              {hoveredPoint.value.toFixed(2)} {unit}
            </span>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingY + plotHeight * pct;
            const gridVal = maxVal - pct * range;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {gridVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Safe Normal Envelope Shading */}
          {minNormal !== undefined && maxNormal !== undefined && (
            <rect
              x={paddingX}
              y={Math.min(normalY1, normalY2)}
              width={plotWidth}
              height={Math.abs(normalY2 - normalY1)}
              fill="#22C55E"
              fillOpacity="0.08"
            />
          )}

          {/* Threshold dashed lines */}
          {minNormal !== undefined && (
            <line
              x1={paddingX}
              y1={normalY2}
              x2={width - paddingX}
              y2={normalY2}
              stroke="#22C55E"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}
          {maxNormal !== undefined && (
            <line
              x1={paddingX}
              y1={normalY1}
              x2={width - paddingX}
              y2={normalY1}
              stroke="#22C55E"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#grad-${title.replace(/\s+/g, '')})`} />

          {/* Main Trend Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineStr}
          />

          {/* Interactive touch/hover overlay columns */}
          {points.map((p, idx) => (
            <rect
              key={idx}
              x={p.x - plotWidth / (points.length * 2)}
              y={paddingY}
              width={plotWidth / points.length}
              height={plotHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}

          {/* Hover Crosshair indicator */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingY}
                x2={hoveredPoint.x}
                y2={paddingY + plotHeight}
                stroke="#0EA5E9"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill="#0EA5E9"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Time axis marks */}
          {points.length > 0 && (
            <>
              <text
                x={paddingX}
                y={height - 6}
                textAnchor="start"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {new Date(points[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
              <text
                x={width - paddingX}
                y={height - 6}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {new Date(points[points.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
