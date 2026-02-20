import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { MapPin } from "lucide-react";
import { formatCompact, CHART_COLORS } from "./types";

interface DeviceItem { device: string; clicks: number; impressions: number; }
interface CountryItem { country: string; clicks: number; impressions: number; }

interface OverviewDevicesCountriesProps {
  devices: DeviceItem[];
  countries: CountryItem[];
}

export function OverviewDevicesCountries({ devices, countries }: OverviewDevicesCountriesProps) {
  if (devices.length === 0 && countries.length === 0) return null;

  const deviceChartData = devices.map((d, i) => ({
    name: d.device === "MOBILE" ? "Mobile" : d.device === "TABLET" ? "Tablet" : "Desktop",
    value: d.clicks || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const countryChartData = countries.slice(0, 8).map(d => ({
    country: d.country || "??",
    clicks: d.clicks || 0,
    impressions: d.impressions || 0,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {deviceChartData.length > 0 && (
        <AnimatedContainer delay={0.18}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold tracking-tight font-display">Dispositivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-[160px] w-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deviceChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                        {deviceChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {deviceChartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: d.fill }} />
                        <span className="text-xs font-medium text-foreground">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums">{formatCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}
      {countryChartData.length > 0 && (
        <AnimatedContainer delay={0.22}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold tracking-tight font-display">Top Países</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryChartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Cliques" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
