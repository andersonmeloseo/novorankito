import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const ENTITY_TYPES = [
  { value: "empresa", label: "Empresa" },
  { value: "produto", label: "Produto" },
  { value: "servico", label: "Serviço" },
  { value: "local", label: "Local" },
  { value: "pessoa", label: "Pessoa" },
  { value: "site", label: "Site" },
  { value: "gbp", label: "GBP" },
  { value: "avaliacao", label: "Avaliação" },
];

export const SCHEMA_TYPES: Record<string, string[]> = {
  empresa: ["Organization", "Corporation", "LocalBusiness"],
  produto: ["Product", "IndividualProduct", "ProductGroup"],
  servico: ["Service", "ProfessionalService"],
  local: ["Place", "LocalBusiness", "PostalAddress"],
  pessoa: ["Person"],
  site: ["WebSite", "WebPage"],
  gbp: ["LocalBusiness"],
  avaliacao: ["Review", "AggregateRating"],
};

export interface EntityFormData {
  name: string;
  entityType: string;
  schemaType: string;
  description: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entity: EntityFormData) => void;
  initialData?: EntityFormData | null;
  mode?: "create" | "edit";
}

export function CreateEntityDialog({ open, onOpenChange, onSubmit, initialData, mode = "create" }: Props) {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("empresa");
  const [schemaType, setSchemaType] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setEntityType(initialData.entityType);
      setSchemaType(initialData.schemaType);
      setDescription(initialData.description);
    } else if (open && !initialData) {
      setName("");
      setEntityType("empresa");
      setSchemaType("");
      setDescription("");
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), entityType, schemaType, description });
    onOpenChange(false);
  };

  const availableSchemas = SCHEMA_TYPES[entityType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Entidade" : "Nova Entidade"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Altere os dados da entidade." : "Adicione um nó ao grafo semântico do seu negócio."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entity-name">Nome</Label>
            <Input
              id="entity-name"
              placeholder="Ex: Minha Empresa Ltda"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Entidade</Label>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setSchemaType(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {availableSchemas.length > 0 && (
            <div className="space-y-2">
              <Label>Schema.org (sugerido)</Label>
              <Select value={schemaType} onValueChange={setSchemaType}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {availableSchemas.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Descreva brevemente esta entidade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {mode === "edit" ? "Salvar" : "Criar Entidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
