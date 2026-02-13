import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/lib/mock-data";
import { Globe, Plus, Wifi, WifiOff } from "lucide-react";

export default function ProjectsList() {
  const navigate = useNavigate();

  return (
    <>
      <TopBar title="Projects" subtitle="Manage your sites" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Projects</h2>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/onboarding")}>
            <Plus className="h-3.5 w-3.5" /> New Project
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProjects.map((project) => (
            <Card
              key={project.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/overview")}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">{project.type} · {project.country}</p>
                  </div>
                </div>
                <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-[10px]">
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-success" /> GSC
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-success" /> GA4
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <WifiOff className="h-3 w-3" /> Ads
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
