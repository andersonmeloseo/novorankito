import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, Crown } from "lucide-react";

interface UserStatsCardsProps {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminCount: number;
}

export function UserStatsCards({ totalUsers, activeUsers, suspendedUsers, adminCount }: UserStatsCardsProps) {
  const stats = [
    { label: "Total de Usuários", value: totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Usuários Ativos", value: activeUsers, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
    { label: "Suspensos", value: suspendedUsers, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Admins / Owners", value: adminCount, icon: Crown, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-display">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
