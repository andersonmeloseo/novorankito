import { useState } from "react";
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

const ENTITY_TYPES = [
  { value: "empresa", label: "Empresa" },
  { value: "produto", label: "Produto" },
  { value: "servico", label: "Serviço" },
  { value: "local", label: "Local" },
  { value: "pessoa", label: "Pessoa" },
  { value: "site", label: "Site" },
  { value: "gbp", label: "GBP" },
  { value: "avaliacao", label: "Avaliação" },
];

const SCHEMA_TYPES: Record<string, string[]> = {
  empresa: ["Organization", "Corporation", "LocalBusiness"],
  produto: ["Product", "IndividualProduct", "ProductGroup"],
  servico: ["Service", "ProfessionalService"],
  local: ["Place", "LocalBusiness", "PostalAddress"],
  pessoa: ["Person"],
  site: ["WebSite", "WebPage"],
  gbp: ["LocalBusiness"],
  avaliacao: ["Review", "AggregateRating"],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entity: {
    name: string;
    entityType: string;
    schemaType: string;
    description: string;
  }) => void;
}

export function CreateEntityDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("empresa");
  const [schemaType, setSchemaType] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), entityType, schemaType, description });
    setName("");
    setEntityType("empresa");
    setSchemaType("");
    setDescription("");
    onOpenChange(false);
  };

  const availableSchemas = SCHEMA_TYPES[entityType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Entidade</DialogTitle>
          <DialogDescription>Adicione um nó ao grafo semântico do seu negócio.</DialogDescription>
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
          <Button onClick={handleSubmit} disabled={!name.trim()}>Criar Entidade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
