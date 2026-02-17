import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFESSIONAL_ROLES, ORCHESTRATOR_PRESETS, DEFAULT_HIERARCHY, type ProfessionalRole } from "./OrchestratorTemplates";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { CanvasNodeData } from "./types";

interface CreateOrchestratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (nodes: Node[], edges: Edge[], name: string) => void;
}

export function CreateOrchestratorDialog({ open, onOpenChange, onGenerated }: CreateOrchestratorDialogProps) {
  const [name, setName] = useState("Minha Agência");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(["ceo"]));
  const [step, setStep] = useState<"preset" | "custom">("preset");

  const toggleRole = (id: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (id === "ceo") return next; // CEO always selected
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPreset = (presetId: string) => {
    const preset = ORCHESTRATOR_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedRoles(new Set(preset.roles.map(r => r.id)));
    setName(preset.name);
    setStep("custom"); // go to customization
  };

  const departments = useMemo(() => {
    const map = new Map<string, ProfessionalRole[]>();
    PROFESSIONAL_ROLES.forEach(r => {
      const dept = r.department;
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(r);
    });
    return map;
  }, []);

  const generateOrchestrator = () => {
    const roles = PROFESSIONAL_ROLES.filter(r => selectedRoles.has(r.id));
    if (roles.length < 2) return;

    // Build tree layout
    const ceo = roles.find(r => r.id === "ceo");
    if (!ceo) return;

    // Group by parent
    const childrenOf = new Map<string, ProfessionalRole[]>();
    const roots: ProfessionalRole[] = [];

    roles.forEach(r => {
      if (r.id === "ceo") { roots.push(r); return; }
      const parentId = DEFAULT_HIERARCHY[r.id];
      if (parentId && selectedRoles.has(parentId)) {
        if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
        childrenOf.get(parentId)!.push(r);
      } else {
        // Report directly to CEO if parent not selected
        if (!childrenOf.has("ceo")) childrenOf.set("ceo", []);
        childrenOf.get("ceo")!.push(r);
      }
    });

    // Position nodes in tree layout
    const nodeMap = new Map<string, Node>();
    const allEdges: Edge[] = [];
    const ts = Date.now();
    const HORIZONTAL_SPACING = 280;
    const VERTICAL_SPACING = 180;

    const positionSubtree = (roleId: string, depth: number, startX: number): number => {
      const role = roles.find(r => r.id === roleId)!;
      const children = childrenOf.get(roleId) || [];

      if (children.length === 0) {
        // Leaf node
        const node: Node = {
          id: `orch-${ts}-${roleId}`,
          type: "canvasNode",
          position: { x: startX, y: depth * VERTICAL_SPACING + 50 },
          data: {
            label: `${role.emoji} ${role.title}`,
            nodeType: "agent",
            config: {
              agentName: role.title,
              agentInstructions: role.instructions,
              prompt: `Atue como ${role.title}. Skills: ${role.skills.join(", ")}. Analise os dados disponíveis do projeto e forneça seu relatório/análise.`,
              emoji: role.emoji,
            },
          } as CanvasNodeData,
        };
        nodeMap.set(roleId, node);
        return startX + HORIZONTAL_SPACING;
      }

      // Position children first
      let currentX = startX;
      children.forEach(child => {
        currentX = positionSubtree(child.id, depth + 1, currentX);
      });

      // Center parent above children
      const firstChildNode = nodeMap.get(children[0].id)!;
      const lastChildNode = nodeMap.get(children[children.length - 1].id)!;
      const centerX = (firstChildNode.position.x + lastChildNode.position.x) / 2;

      const node: Node = {
        id: `orch-${ts}-${roleId}`,
        type: "canvasNode",
        position: { x: centerX, y: depth * VERTICAL_SPACING + 50 },
        data: {
          label: `${role.emoji} ${role.title}`,
          nodeType: "agent",
          config: {
            agentName: role.title,
            agentInstructions: role.instructions,
            prompt: `Atue como ${role.title}. Skills: ${role.skills.join(", ")}. Coordene as informações recebidas dos seus subordinados e forneça sua análise consolidada.`,
            emoji: role.emoji,
          },
        } as CanvasNodeData,
      };
      nodeMap.set(roleId, node);

      // Create edges to children
      children.forEach(child => {
        allEdges.push({
          id: `orch-edge-${ts}-${roleId}-${child.id}`,
          source: `orch-${ts}-${roleId}`,
          target: `orch-${ts}-${child.id}`,
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
        });
      });

      return currentX;
    };

    // Add trigger node at the top
    const triggerNode: Node = {
      id: `orch-${ts}-trigger`,
      type: "canvasNode",
      position: { x: 0, y: 0 }, // will be repositioned
      data: {
        label: "Iniciar Orquestrador",
        nodeType: "trigger",
        config: { triggerType: "manual" },
      } as CanvasNodeData,
    };

    positionSubtree("ceo", 1, 0);

    // Position trigger above CEO
    const ceoNode = nodeMap.get("ceo")!;
    triggerNode.position = { x: ceoNode.position.x, y: 0 };

    // Edge from trigger to CEO
    allEdges.unshift({
      id: `orch-edge-${ts}-trigger-ceo`,
      source: triggerNode.id,
      target: ceoNode.id,
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
    });

    const allNodes = [triggerNode, ...Array.from(nodeMap.values())];

    onGenerated(allNodes, allEdges, `🏢 ${name}`);
    onOpenChange(false);
    setStep("preset");
    setSelectedRoles(new Set(["ceo"]));
    setName("Minha Agência");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Criar Orquestrador
          </DialogTitle>
          <DialogDescription>
            Monte sua agência digital com profissionais especializados que trabalham de forma autônoma.
          </DialogDescription>
        </DialogHeader>

        {step === "preset" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-medium">Escolha um template ou monte do zero:</p>
            <div className="grid grid-cols-2 gap-3">
              {ORCHESTRATOR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset.id)}
                  className="text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <span className="text-2xl">{preset.emoji}</span>
                  <h4 className="text-sm font-semibold mt-2 group-hover:text-primary transition-colors">{preset.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">{preset.description}</p>
                  <Badge variant="outline" className="text-[9px] mt-2">{preset.roles.length} profissionais</Badge>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full text-xs gap-2" onClick={() => setStep("custom")}>
              <Users className="h-3.5 w-3.5" /> Montar equipe personalizada
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("preset")}>← Templates</Button>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome do orquestrador"
                className="text-sm h-8 flex-1"
              />
            </div>

            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-4">
                {Array.from(departments.entries()).map(([dept, roles]) => (
                  <div key={dept}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{dept}</p>
                    <div className="space-y-1.5">
                      {roles.map(role => {
                        const isSelected = selectedRoles.has(role.id);
                        const isCeo = role.id === "ceo";
                        return (
                          <button
                            key={role.id}
                            onClick={() => toggleRole(role.id)}
                            className={cn(
                              "flex items-center gap-3 w-full p-3 rounded-lg border transition-all text-left",
                              isSelected ? "border-primary/50 bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/20",
                              isCeo && "opacity-90"
                            )}
                          >
                            <Checkbox checked={isSelected} disabled={isCeo} className="shrink-0" />
                            <span className="text-lg">{role.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{role.title}</span>
                                {isCeo && <Badge variant="outline" className="text-[8px]">Obrigatório</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {role.skills.slice(0, 3).map(s => (
                                  <Badge key={s} variant="secondary" className="text-[8px] px-1.5 py-0">{s}</Badge>
                                ))}
                                {role.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0">+{role.skills.length - 3}</Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                {selectedRoles.size} profissionais selecionados
              </span>
              <Button
                onClick={generateOrchestrator}
                disabled={selectedRoles.size < 2}
                className="gap-2"
                size="sm"
              >
                <Sparkles className="h-3.5 w-3.5" /> Criar Orquestrador
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
