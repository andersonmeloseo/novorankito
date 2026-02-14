import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// City approximate coordinates [lng, lat]
const CITY_COORDS: Record<string, [number, number]> = {
  "São Paulo": [-46.63, -23.55], "Rio de Janeiro": [-43.17, -22.91], "Belo Horizonte": [-43.94, -19.92],
  "Curitiba": [-49.27, -25.43], "Porto Alegre": [-51.18, -30.03], "Salvador": [-38.51, -12.97],
  "Recife": [-34.87, -8.05], "Fortaleza": [-38.54, -3.72], "Brasília": [-47.93, -15.78],
  "Florianópolis": [-48.55, -27.59], "Goiânia": [-49.25, -16.68], "Manaus": [-60.02, -3.12],
  "Belém": [-48.5, -1.45], "Campinas": [-47.06, -22.91], "Vitória": [-40.34, -20.32],
  "Joinville": [-48.85, -26.3], "Londrina": [-51.16, -23.31], "Maringá": [-51.94, -23.42],
  "Blumenau": [-49.07, -26.92], "Balneário Camboriú": [-48.63, -26.99],
  "New York": [-74.0, 40.71], "Los Angeles": [-118.24, 34.05], "Chicago": [-87.63, 41.88],
  "Houston": [-95.37, 29.76], "Miami": [-80.19, 25.76], "San Francisco": [-122.42, 37.77],
  "Seattle": [-122.33, 47.61], "Denver": [-104.99, 39.74], "Dallas": [-96.8, 32.78],
  "Atlanta": [-84.39, 33.75], "Boston": [-71.06, 42.36],
  "Lisboa": [-9.14, 38.74], "Porto": [-8.61, 41.15], "Madrid": [-3.7, 40.42],
  "Barcelona": [2.17, 41.39], "Londres": [-0.13, 51.51], "London": [-0.13, 51.51],
  "Paris": [2.35, 48.86], "Berlim": [13.41, 52.52], "Berlin": [13.41, 52.52],
  "Roma": [12.5, 41.9], "Rome": [12.5, 41.9], "Milão": [9.19, 45.46], "Milan": [9.19, 45.46],
  "Amsterdam": [4.9, 52.37], "Munique": [11.58, 48.14], "Munich": [11.58, 48.14],
  "Buenos Aires": [-58.38, -34.6], "Bogotá": [-74.07, 4.71], "Santiago": [-70.67, -33.45],
  "Cidade do México": [-99.13, 19.43], "Mexico City": [-99.13, 19.43],
  "Tokyo": [139.69, 35.69], "Tóquio": [139.69, 35.69], "Seoul": [126.98, 37.57],
  "Sydney": [151.21, -33.87], "Melbourne": [144.96, -37.81],
  "Mumbai": [72.88, 19.08], "Delhi": [77.1, 28.7], "New Delhi": [77.1, 28.7],
  "Shanghai": [121.47, 31.23], "Beijing": [116.41, 39.9], "Pequim": [116.41, 39.9],
  "Dubai": [55.27, 25.2], "Singapura": [103.85, 1.35], "Singapore": [103.85, 1.35],
  "Bangkok": [100.5, 13.76], "Jakarta": [106.85, -6.21], "Manila": [120.98, 14.6],
  "Cairo": [31.24, 30.04], "Lagos": [3.39, 6.52], "Johannesburg": [28.05, -26.2],
  "Nairobi": [36.82, -1.29], "Toronto": [-79.38, 43.65], "Vancouver": [-123.12, 49.28],
  "Montreal": [-73.57, 45.5], "Lima": [-77.03, -12.05], "Quito": [-78.47, -0.18],
  "Montevideo": [-56.16, -34.9], "Taipei": [121.57, 25.03], "Hong Kong": [114.17, 22.32],
  "Cuiabá": [-56.1, -15.6], "Campo Grande": [-54.62, -20.44],
  "(not set)": [0, 0],
};

interface WorldMapProps {
  countryData: { name: string; value: number }[];
  cityData?: { name: string; value: number }[];
}

export function WorldMap({ countryData, cityData = [] }: WorldMapProps) {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 0],
    zoom: 1,
  });
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const maxCountryVal = useMemo(() => Math.max(...countryData.map(c => c.value), 1), [countryData]);
  const countryMap = useMemo(() => {
    const m: Record<string, number> = {};
    countryData.forEach(c => { m[c.name] = c.value; });
    return m;
  }, [countryData]);

  const cityMarkers = useMemo(() => {
    const maxCity = Math.max(...cityData.map(c => c.value), 1);
    return cityData
      .filter(c => c.name && c.name !== "(not set)" && CITY_COORDS[c.name])
      .map(c => {
        const coords = CITY_COORDS[c.name]!;
        const ratio = c.value / maxCity;
        const r = Math.max(3, Math.min(14, 3 + ratio * 11));
        return { name: c.name, value: c.value, coords, r, ratio };
      });
  }, [cityData]);

  const handleZoomIn = useCallback(() => {
    setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  }, []);
  const handleZoomOut = useCallback(() => {
    setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  }, []);
  const handleReset = useCallback(() => {
    setPosition({ coordinates: [0, 0], zoom: 1 });
  }, []);
  const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos);
  }, []);

  // GA4-like country name matching
  const getCountryFill = (geoName: string) => {
    const val = countryMap[geoName];
    if (!val) return "hsl(var(--muted))";
    const ratio = val / maxCountryVal;
    // From muted to chart-1 intensity
    const opacity = 0.2 + ratio * 0.6;
    return `hsla(var(--chart-1) / ${opacity})`;
  };

  return (
    <div className="relative w-full h-full rounded-lg bg-muted/20 overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleReset}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tooltip */}
      {hoveredMarker && (
        <div className="absolute top-2 left-2 z-10 bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg text-xs">
          <span className="font-medium text-foreground">{hoveredMarker}</span>
        </div>
      )}

      <ComposableMap
        projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          minZoom={1}
          maxZoom={8}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryFill(name)}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "hsl(var(--chart-1) / 0.5)", outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      const val = countryMap[name];
                      if (val) setHoveredMarker(`${name}: ${val} ativos`);
                    }}
                    onMouseLeave={() => setHoveredMarker(null)}
                  />
                );
              })
            }
          </Geographies>

          {/* City markers */}
          {cityMarkers.map((city, i) => (
            <Marker
              key={i}
              coordinates={city.coords}
              onMouseEnter={() => setHoveredMarker(`📍 ${city.name}: ${city.value} ativos`)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <circle
                r={city.r / position.zoom}
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3 + city.ratio * 0.4}
                stroke="hsl(var(--chart-2))"
                strokeWidth={1 / position.zoom}
                strokeOpacity={0.6 + city.ratio * 0.4}
                style={{ cursor: "pointer" }}
              />
              <circle
                r={Math.max(1.5, city.r * 0.35) / position.zoom}
                fill="hsl(var(--chart-2))"
                fillOpacity={0.7 + city.ratio * 0.3}
              />
              {position.zoom >= 2 && (
                <text
                  textAnchor="middle"
                  y={-(city.r / position.zoom) - 3 / position.zoom}
                  style={{
                    fontSize: `${Math.max(7, 10 / position.zoom)}px`,
                    fill: "hsl(var(--foreground))",
                    fillOpacity: 0.8,
                    fontFamily: "inherit",
                  }}
                >
                  {city.name}
                </text>
              )}
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}