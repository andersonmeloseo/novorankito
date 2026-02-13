import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Mail, Webhook } from "lucide-react";

const REPORT_TEMPLATES = [
  { name: "Weekly SEO Report", description: "Clicks, impressions, CTR, position changes, top queries", frequency: "Weekly", lastGenerated: "2026-02-10" },
  { name: "Monthly Growth Report", description: "Users, sessions, conversions, revenue trends, channel breakdown", frequency: "Monthly", lastGenerated: "2026-02-01" },
  { name: "Conversion Report", description: "Conversion events, funnels, attribution, revenue by source", frequency: "Weekly", lastGenerated: "2026-02-10" },
  { name: "Ads + CRO Summary", description: "Campaign performance, CPA, ROAS, best time analysis", frequency: "Bi-weekly", lastGenerated: "2026-02-03" },
];

export default function ReportsPage() {
  return (
    <>
      <TopBar title="Reports" subtitle="Export & Scheduling" />
      <div className="p-6 space-y-6">
        {/* Templates */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Report Templates</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {REPORT_TEMPLATES.map((r) => (
              <Card key={r.name} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">{r.name}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{r.frequency}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{r.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Last: {r.lastGenerated}</span>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                      <Download className="h-3 w-3" /> XLSX
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Scheduling
          </h3>
          <div className="space-y-3">
            {[
              { icon: Mail, label: "Email delivery", desc: "Send reports to team@acme.com every Monday 9:00 AM", active: true },
              { icon: Webhook, label: "Webhook", desc: "POST to https://hooks.acme.com/reports", active: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-foreground">{s.label}</span>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
                <Badge variant={s.active ? "default" : "secondary"} className="text-[9px]">
                  {s.active ? "Active" : "Off"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
