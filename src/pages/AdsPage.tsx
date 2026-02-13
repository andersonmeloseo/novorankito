import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockAdsCampaigns } from "@/lib/mock-data";

export default function AdsPage() {
  const totalCost = mockAdsCampaigns.reduce((s, c) => s + c.cost, 0);
  const totalConversions = mockAdsCampaigns.reduce((s, c) => s + c.conversions, 0);
  const avgCpa = totalCost / totalConversions;
  const avgRoas = mockAdsCampaigns.reduce((s, c) => s + c.roas, 0) / mockAdsCampaigns.length;

  return (
    <>
      <TopBar title="Ads" subtitle="Google Ads & Meta" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Spend" value={totalCost} change={-4.2} prefix="$" />
          <KpiCard label="Conversions" value={totalConversions} change={12.8} />
          <KpiCard label="Avg. CPA" value={Number(avgCpa.toFixed(2))} change={-8.1} prefix="$" />
          <KpiCard label="Avg. ROAS" value={Number(avgRoas.toFixed(1))} change={6.3} suffix="x" />
        </div>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Campaign", "Platform", "Cost", "Clicks", "Conversions", "CPA", "ROAS"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockAdsCampaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{c.platform}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">${c.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">{c.conversions}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">${c.cpa.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Best time card */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-3">Best Time to Invest</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Best Day", value: "Tuesday" },
              { label: "Best Hour", value: "10:00–14:00" },
              { label: "Worst Day", value: "Sunday" },
              { label: "Peak ROAS", value: "4.8x (Tue 11h)" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
