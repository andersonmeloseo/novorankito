import { Badge } from "@/components/ui/badge";
import { Globe, ArrowLeft, Trash2 } from "lucide-react";

interface PageRowProps {
  url: string;
  clicks: number;
  views: number;
  visitors: number;
  avgScroll: number;
  topCity: string;
  topCountry: string;
  topBrowser: string;
  topReferrer: string;
  devices: string[];
  lastEvent: string;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isEven?: boolean;
}

export function PageRow({ url, clicks, views, visitors, avgScroll, topCity, topCountry, topBrowser, topReferrer, devices, lastEvent, onClick, onDelete, isEven }: PageRowProps) {
  let pathname = url;
  try { pathname = new URL(url).pathname; } catch { /* keep full url */ }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const location = [topCity, topCountry].filter(Boolean).join(", ");
  const deviceLabel = devices.length > 0 ? devices.map(d => d === "desktop" ? "🖥" : d === "mobile" ? "📱" : "📟").join(" ") : "—";
  let referrerShort = topReferrer || "—";
  try { if (topReferrer) referrerShort = new URL(topReferrer).hostname.replace("www.", ""); } catch { /* keep as is */ }

  return (
    <tr
      className={`group table-row-hover cursor-pointer border-b border-border/50 last:border-0 transition-colors ${isEven ? "bg-muted/[0.04]" : ""} hover:bg-primary/[0.03]`}
      onClick={onClick}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate max-w-[260px]" title={url}>{pathname}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[260px]" title={url}>{url}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <p className="text-xs font-bold text-foreground">{views.toLocaleString("pt-BR")}</p>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="flex flex-col items-center">
          <p className="text-xs font-bold text-foreground">{clicks.toLocaleString("pt-BR")}</p>
          {views > 0 && (
            <p className="text-[9px] text-muted-foreground">{Math.round((clicks / views) * 100)}% CTR</p>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <p className="text-xs font-bold text-foreground">{visitors.toLocaleString("pt-BR")}</p>
      </td>
      <td className="py-3 px-3 text-center hidden lg:table-cell">
        <div className="flex flex-col items-center">
          <p className="text-xs font-bold text-foreground">{avgScroll}%</p>
          <div className="w-12 h-1 bg-muted rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${avgScroll}%`,
                background: avgScroll >= 70 ? "hsl(var(--success))" : avgScroll >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
              }}
            />
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-center hidden lg:table-cell">
        <p className="text-[10px] text-muted-foreground" title={devices.join(", ")}>{deviceLabel}</p>
      </td>
      <td className="py-3 px-3 hidden xl:table-cell">
        <Badge variant="outline" className="text-[8px]">{topBrowser || "—"}</Badge>
      </td>
      <td className="py-3 px-3 hidden md:table-cell">
        <p className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={location}>{location || "—"}</p>
      </td>
      <td className="py-3 px-3 hidden xl:table-cell">
        <p className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={topReferrer}>{referrerShort}</p>
      </td>
      <td className="py-3 px-3 text-right hidden md:table-cell">
        <p className="text-[10px] text-muted-foreground">{fmtDate(lastEvent)}</p>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            className="h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
            onClick={onDelete}
            title="Excluir dados desta página"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </td>
    </tr>
  );
}

/* ── Sortable Table Header ── */
export function SortHeader({ label, field, current, onSort, className = "" }: { label: string; field: string; current: string; onSort: (f: string) => void; className?: string }) {
  const isActive = current === field || current === `-${field}`;
  const isDesc = current === field;
  return (
    <th
      className={`py-2.5 px-3 text-[10px] uppercase tracking-wider font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(isActive && isDesc ? `-${field}` : field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && <span className="text-primary">{isDesc ? "↓" : "↑"}</span>}
      </span>
    </th>
  );
}
