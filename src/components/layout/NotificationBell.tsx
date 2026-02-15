import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
} as const;

const TYPE_COLORS = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  error: "text-destructive",
  success: "text-emerald-500",
} as const;

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border border-border shadow-lg z-50" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[350px]">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Sem notificações
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] || Info;
                const color = TYPE_COLORS[n.type as keyof typeof TYPE_COLORS] || "text-muted-foreground";

                return (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.is_read) markRead.mutate(n.id);
                      if (n.action_url) navigate(n.action_url);
                    }}
                  >
                    <div className="flex gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">{n.title}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(n.id);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
