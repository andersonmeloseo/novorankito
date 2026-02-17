import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Building2, Sparkles, Clock, Zap, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFESSIONAL_ROLES, ORCHESTRATOR_PRESETS, DEFAULT_HIERARCHY, FREQUENCY_LABELS, type ProfessionalRole } from "./OrchestratorTemplates";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { CanvasNodeData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateOrchestratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (nodes: Node[], edges: Edge[], name: string) => void;
  projectId?: string;
}

export function CreateOrchestratorDialog({ open, onOpenChange, onGenerated, projectId }: CreateOrchestratorDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("Minha Agência");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(["ceo"]));
  const [step, setStep] = useState<"preset" | "custom" | "review">("preset");
  const [deploying, setDeploying] = useState(false);

  const toggleRole = (id: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (id === "ceo") return next;
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
    setStep("custom");
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

  const selectedRolesList = useMemo(
    () => PROFESSIONAL_ROLES.filter(r => selectedRoles.has(r.id)),
    [selectedRoles]
  );

  const handleDeploy = async () => {
    if (!projectId || !user) {
      toast.error("Selecione um projeto primeiro");
      return;
    }
    setDeploying(true);
    try {
      // Build hierarchy for selected roles
      const activeHierarchy: Record<string, string> = {};
      selectedRolesList.forEach(r => {
        if (r.id === "ceo") return;
        const parentId = DEFAULT_HIERARCHY[r.id];
        if (parentId && selectedRoles.has(parentId)) {
          activeHierarchy[r.id] = parentId;
        } else {
          activeHierarchy[r.id] = "ceo";
        }
      });

      const rolesPayload = selectedRolesList.map(r => ({
        id: r.id,
        title: r.title,
        emoji: r.emoji,
        instructions: r.instructions,
        routine: r.routine,
      }));

      // Save deployment
      const { data: deployment, error } = await supabase
        .from("orchestrator_deployments")
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name,
          roles: rolesPayload as any,
          hierarchy: activeHierarchy as any,
          delivery_channels: ["notification"] as any,
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Trigger first run immediately
      const { error: runError } = await supabase.functions.invoke("run-orchestrator", {
        body: {
          deployment_id: deployment.id,
          project_id: projectId,
          owner_id: user.id,
          roles: rolesPayload,
          hierarchy: activeHierarchy,
          trigger_type: "manual",
        },
      });

      if (runError) throw runError;

      toast.success(`🏢 "${name}" implantado! Primeira execução em andamento...`);
      onOpenChange(false);
      setStep("preset");
      setSelectedRoles(new Set(["ceo"]));
      setName("Minha Agência");
    } catch (err: any) {
      toast.error(err.message || "Erro ao implantar orquestrador");
    } finally {
      setDeploying(false);
    }
  };

  const generateCanvas = () => {
    const roles = selectedRolesList;
    if (roles.length < 2) return;

    const ceo = roles.find(r => r.id === "ceo");
    if (!ceo) return;

    const childrenOf = new Map<string, ProfessionalRole[]>();

    roles.forEach(r => {
      if (r.id === "ceo") return;
      const parentId = DEFAULT_HIERARCHY[r.id];
      if (parentId && selectedRoles.has(parentId)) {
        if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
        childrenOf.get(parentId)!.push(r);
      } else {
        if (!childrenOf.has("ceo")) childrenOf.set("ceo", []);
        childrenOf.get("ceo")!.push(r);
      }
    });

    const nodeMap = new Map<string, Node>();
    const allEdges: Edge[] = [];
    const ts = Date.now();
    const HORIZONTAL_SPACING = 280;
    const VERTICAL_SPACING = 180;

    const positionSubtree = (roleId: string, depth: number, startX: number): number => {
      const role = roles.find(r => r.id === roleId)!;
      const children = childrenOf.get(roleId) || [];

      if (children.length === 0) {
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

      let currentX = startX;
      children.forEach(child => {
        currentX = positionSubtree(child.id, depth + 1, currentX);
      });

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

    const triggerNode: Node = {
      id: `orch-${ts}-trigger`,
      type: "canvasNode",
      position: { x: 0, y: 0 },
      data: {
        label: "Iniciar Orquestrador",
        nodeType: "trigger",
        config: { triggerType: "manual" },
      } as CanvasNodeData,
    };

    positionSubtree("ceo", 1, 0);

    const ceoNode = nodeMap.get("ceo")!;
    triggerNode.position = { x: ceoNode.position.x, y: 0 };

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
            Criar Orquestrador Autônomo
          </DialogTitle>
          <DialogDescription>
            Monte sua equipe de IA que trabalha autonomamente, com rotinas definidas e relatórios automáticos.
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
        ) : step === "custom" ? (
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

            <ScrollArea className="h-[350px] pr-2">
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
                                <Badge variant="secondary" className="text-[8px] gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {FREQUENCY_LABELS[role.routine.frequency]}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {role.skills.slice(0, 3).map(s => (
                                  <Badge key={s} variant="secondary" className="text-[8px] px-1.5 py-0">{s}</Badge>
                                ))}
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
                {selectedRoles.size} profissionais
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateCanvas} disabled={selectedRoles.size < 2} size="sm" className="gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5" /> Ver no Canvas
                </Button>
                <Button onClick={() => setStep("review")} disabled={selectedRoles.size < 2} size="sm" className="gap-2 text-xs">
                  <Zap className="h-3.5 w-3.5" /> Revisar e Implantar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Review step */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("custom")}>← Voltar</Button>
              <h3 className="text-sm font-semibold flex-1">Revisão: {name}</h3>
            </div>

            <ScrollArea className="h-[380px] pr-2">
              <div className="space-y-3">
                {selectedRolesList.map(role => {
                  const parentId = DEFAULT_HIERARCHY[role.id];
                  const parent = parentId ? PROFESSIONAL_ROLES.find(r => r.id === parentId) : null;
                  const reportTo = parent && selectedRoles.has(parent.id) ? parent : PROFESSIONAL_ROLES.find(r => r.id === "ceo");

                  return (
                    <div key={role.id} className="p-3 rounded-lg border border-border bg-card/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{role.emoji}</span>
                        <span className="text-xs font-bold">{role.title}</span>
                        <Badge variant="secondary" className="text-[8px] gap-1 ml-auto">
                          <Clock className="h-2.5 w-2.5" />
                          {FREQUENCY_LABELS[role.routine.frequency]}
                        </Badge>
                      </div>

                      {role.id !== "ceo" && reportTo && (
                        <p className="text-[10px] text-muted-foreground">
                          Reporta para: <span className="font-semibold">{reportTo.emoji} {reportTo.title}</span>
                        </p>
                      )}

                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Rotina</p>
                        <ul className="space-y-0.5">
                          {role.routine.tasks.map((task, i) => (
                            <li key={i} className="text-[10px] text-foreground/80 flex gap-1.5">
                              <span className="text-primary">•</span> {task}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Ações Autônomas</p>
                        <div className="flex flex-wrap gap-1">
                          {role.routine.autonomousActions.map((action, i) => (
                            <Badge key={i} variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-600">
                              <Zap className="h-2 w-2 mr-0.5" /> {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                {selectedRoles.size} agentes • Execução bottom-up (analistas → gerentes → CEO)
              </span>
              <Button
                onClick={handleDeploy}
                disabled={deploying || !projectId}
                size="sm"
                className="gap-2"
              >
                {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {deploying ? "Implantando..." : "Implantar Agora"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
