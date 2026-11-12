import React from 'react';
import { Station } from '../../types';

interface WatershedMapProps {
  stations: Station[];
  selectedStationId?: string;
  onSelectStation: (stationId: string) => void;
}

export const WatershedMap: React.FC<WatershedMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
}) => {
  // Relative schematic coordinates for the 6 primary stations along the watershed
  const stationSchematicPositions: Record<string, { x: number; y: number }> = {
    'STN-01': { x: 120, y: 70 },   // Highland Reservoir Intake (Upstream mountain)
    'STN-02': { x: 260, y: 120 },  // Bear Mountain Clear Creek (Tributary)
    'STN-03': { x: 420, y: 170 },  // Industrial Confluence (Middle river)
    'STN-04': { x: 580, y: 130 },  // Metro Treatment Plant #4
    'STN-05': { x: 380, y: 250 },  // Blue Lake Outpost
    'STN-06': { x: 740, y: 220 },  // Coastal Estuary Tidal Delta
  };

  return (
    <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">Regional Watershed & Hydrological Basin Topology</h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" /> Critical
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 860 300" className="w-full min-w-[700px] h-auto select-none">
          <defs>
            {/* Water flow gradient */}
            <linearGradient id="riverFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>

            <pattern id="basinGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect width="860" height="300" fill="url(#basinGrid)" />

          {/* Elevation topography contours */}
          <ellipse cx="120" cy="70" rx="90" ry="50" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" strokeDasharray="3 3" />
          <ellipse cx="120" cy="70" rx="60" ry="35" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
          <ellipse cx="380" cy="250" rx="80" ry="40" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />

          {/* Main River Channel */}
          <path
            d="M 120 70 C 180 80, 220 110, 260 120 C 330 140, 370 160, 420 170 C 490 180, 530 140, 580 130 C 650 120, 690 180, 740 220"
            fill="none"
            stroke="url(#riverFlow)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Animated Water flow stream line */}
          <path
            d="M 120 70 C 180 80, 220 110, 260 120 C 330 140, 370 160, 420 170 C 490 180, 530 140, 580 130 C 650 120, 690 180, 740 220"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="2"
            strokeDasharray="8 12"
            strokeLinecap="round"
            className="animate-pulse"
          />

          {/* Tributary from Blue Lake to Confluence */}
          <path
            d="M 380 250 C 400 220, 410 190, 420 170"
            fill="none"
            stroke="url(#riverFlow)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Outflow into Ocean / Estuary Basin */}
          <path
            d="M 740 220 C 780 240, 820 260, 850 280"
            fill="none"
            stroke="url(#riverFlow)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* Elevation Labels */}
          <text x="50" y="45" className="fill-slate-500 text-[10px] font-mono">NORTH RIDGELINE (640m)</text>
          <text x="730" y="275" className="fill-slate-500 text-[10px] font-mono">PACIFIC TIDAL DELTA (0m)</text>

          {/* Stations Node Pins */}
          {stations.map((stn) => {
            const pos = stationSchematicPositions[stn.id] || { x: 300, y: 150 };
            const isSelected = selectedStationId === stn.id;
            const statusColor =
              stn.status === 'Critical' ? '#EF4444' : stn.status === 'Warning' ? '#F59E0B' : '#10B981';

            return (
              <g
                key={stn.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelectStation(stn.id)}
                className="cursor-pointer group"
              >
                {/* Ping ring for critical/warning */}
                {stn.status !== 'Normal' && (
                  <circle
                    r={isSelected ? '24' : '18'}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Selection halo */}
                {isSelected && (
                  <circle r="22" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 3" />
                )}

                {/* Outer badge */}
                <circle
                  r={isSelected ? '14' : '11'}
                  fill="#0F172A"
                  stroke={statusColor}
                  strokeWidth="3"
                  className="transition-all duration-200 group-hover:scale-125"
                />

                {/* Center dot */}
                <circle r="4" fill={statusColor} />

                {/* Station Card Label */}
                <g transform="translate(0, -22)" className="pointer-events-none">
                  <rect
                    x="-65"
                    y="-16"
                    width="130"
                    height="20"
                    rx="4"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke={isSelected ? '#38BDF8' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                  />
                  <text
                    x="0"
                    y="-3"
                    textAnchor="middle"
                    className="fill-slate-200 text-[10px] font-medium"
                  >
                    {stn.name.length > 18 ? stn.name.substring(0, 16) + '…' : stn.name}
                  </text>
                </g>

                {/* WQI Tag */}
                <g transform="translate(0, 24)" className="pointer-events-none">
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    WQI: {stn.wqi} ({stn.wqiRating})
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Click any telemetry node to isolate sensor parameters & real-time telemetry curves.
        </span>
        <span className="font-mono text-[11px] text-cyan-400">6 Telemetry Stations Synced</span>
      </div>
    </div>
  );
};
