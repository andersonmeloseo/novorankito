import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Pencil, Ban, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";

interface UserTableRowProps {
  profile: any;
  role: string | null;
  projectsCount: number;
  billing: any | null;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
}

export function UserTableRow({ profile, role, projectsCount, billing, selected, onSelect, onEdit, onView }: UserTableRowProps) {
  const initial = (profile.display_name || "U")[0].toUpperCase();

  return (
    <tr className="border-b border-border last:border-0 table-row-hover">
      <td className="px-4 py-3">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{profile.display_name || "Sem nome"}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{profile.user_id.slice(0, 12)}...</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {role ? (
          <Badge variant={role === "owner" || role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">{role}</Badge>
        ) : <span className="text-[10px] text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-[10px] capitalize">{billing?.plan || "free"}</Badge>
      </td>
      <td className="px-4 py-3">
        {billing ? (
          <Badge variant={getStatusVariant(billing.status)} className="text-[10px]">{translateStatus(billing.status)}</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Gratuito</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{projectsCount}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(profile.created_at), "dd/MM/yyyy")}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onView} title="Ver detalhes">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={onEdit}>Editar Usuário</DropdownMenuItem>
              <DropdownMenuItem onClick={onView}>Ver Detalhes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive"><Ban className="h-3 w-3 mr-1.5" /> Suspender</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
