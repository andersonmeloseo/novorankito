import { useMemo } from "react";

// Simplified world map with country centroids for dot visualization
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "Brazil": [330, 280], "United States": [160, 160], "Canada": [170, 110],
  "Mexico": [130, 195], "Argentina": [300, 330], "Colombia": [260, 230],
  "Chile": [280, 320], "Peru": [270, 260], "Venezuela": [280, 220],
  "Ecuador": [255, 245], "Bolivia": [290, 280], "Uruguay": [320, 310],
  "Paraguay": [310, 290], "United Kingdom": [460, 115], "France": [470, 140],
  "Germany": [490, 120], "Spain": [455, 150], "Italy": [495, 145],
  "Portugal": [445, 150], "Netherlands": [478, 118], "Belgium": [475, 125],
  "Switzerland": [485, 135], "Austria": [500, 130], "Poland": [510, 118],
  "Sweden": [500, 90], "Norway": [490, 80], "Denmark": [490, 105],
  "Finland": [520, 80], "Ireland": [450, 115], "Czech Republic": [505, 125],
  "Romania": [525, 135], "Greece": [520, 150], "Turkey": [555, 148],
  "Russia": [600, 95], "Ukraine": [540, 125], "India": [640, 195],
  "China": [700, 160], "Japan": [770, 155], "South Korea": [750, 155],
  "Australia": [760, 320], "New Zealand": [810, 350], "Indonesia": [720, 250],
  "Thailand": [690, 210], "Vietnam": [710, 210], "Philippines": [740, 215],
  "Malaysia": [710, 235], "Singapore": [710, 240], "South Africa": [530, 310],
  "Nigeria": [480, 220], "Egypt": [540, 180], "Kenya": [555, 250],
  "Morocco": [450, 170], "Israel": [555, 165], "Saudi Arabia": [575, 190],
  "United Arab Emirates": [600, 190], "Pakistan": [625, 180],
  "Bangladesh": [655, 195], "Taiwan": [740, 190], "Hong Kong": [730, 195],
};

interface WorldMapProps {
  countryData: { name: string; value: number }[];
}

export function WorldMap({ countryData }: WorldMapProps) {
  const maxVal = useMemo(() => Math.max(...countryData.map(c => c.value), 1), [countryData]);

  const dots = useMemo(() => {
    return countryData
      .map(c => {
        const coords = COUNTRY_COORDS[c.name];
        if (!coords) return null;
        const ratio = c.value / maxVal;
        const r = Math.max(4, Math.min(18, 4 + ratio * 14));
        return { ...c, x: coords[0], y: coords[1], r, ratio };
      })
      .filter(Boolean) as { name: string; value: number; x: number; y: number; r: number; ratio: number }[];
  }, [countryData, maxVal]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-muted/30">
      <svg viewBox="0 0 900 420" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines for map feel */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <line key={`h${i}`} x1="0" y1={i * 60 + 30} x2="900" y2={i * 60 + 30} stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
          <line key={`v${i}`} x1={i * 75 + 37} y1="0" x2={i * 75 + 37} y2="420" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
        ))}

        {/* Simplified continent outlines */}
        {/* North America */}
        <ellipse cx="160" cy="150" rx="80" ry="60" fill="hsl(var(--muted))" fillOpacity="0.4" />
        {/* South America */}
        <ellipse cx="290" cy="280" rx="55" ry="80" fill="hsl(var(--muted))" fillOpacity="0.4" />
        {/* Europe */}
        <ellipse cx="490" cy="125" rx="55" ry="35" fill="hsl(var(--muted))" fillOpacity="0.4" />
        {/* Africa */}
        <ellipse cx="510" cy="230" rx="50" ry="70" fill="hsl(var(--muted))" fillOpacity="0.4" />
        {/* Asia */}
        <ellipse cx="660" cy="160" rx="100" ry="60" fill="hsl(var(--muted))" fillOpacity="0.4" />
        {/* Oceania */}
        <ellipse cx="760" cy="310" rx="45" ry="35" fill="hsl(var(--muted))" fillOpacity="0.4" />

        {/* Country dots */}
        {dots.map((dot, i) => (
          <g key={i}>
            <circle
              cx={dot.x} cy={dot.y} r={dot.r}
              fill="hsl(var(--chart-1))"
              fillOpacity={0.15 + dot.ratio * 0.35}
              stroke="hsl(var(--chart-1))"
              strokeWidth="1"
              strokeOpacity={0.4 + dot.ratio * 0.6}
            />
            <circle
              cx={dot.x} cy={dot.y} r={Math.max(2, dot.r * 0.4)}
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6 + dot.ratio * 0.4}
            />
            {dot.r > 8 && (
              <text x={dot.x} y={dot.y - dot.r - 3} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))" fillOpacity="0.7">
                {dot.value}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}