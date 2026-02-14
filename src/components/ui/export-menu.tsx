import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportXML: () => void;
  label?: string;
}

export function ExportMenu({ onExportCSV, onExportXML, label = "Exportar" }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
          <Download className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={onExportCSV} className="text-xs cursor-pointer">
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportXML} className="text-xs cursor-pointer">
          Exportar XML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
