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
  { value: "evento", label: "Evento" },
  { value: "faq", label: "FAQ" },
  { value: "artigo", label: "Artigo" },
  { value: "oferta", label: "Oferta" },
  { value: "marca", label: "Marca" },
  { value: "categoria", label: "Categoria" },
  { value: "imagem", label: "Imagem" },
  { value: "credencial", label: "Credencial" },
  { value: "pagina", label: "Página" },
  { value: "busca", label: "Busca" },
  { value: "pergunta", label: "Pergunta" },
  { value: "horario", label: "Horário" },
  { value: "geo", label: "Geo" },
  { value: "endereco", label: "Endereço" },
  { value: "rating", label: "Rating" },
  { value: "organizacao", label: "Organização" },
  // Depth 4+
  { value: "especialidade", label: "Especialidade" },
  { value: "equipamento", label: "Equipamento" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "curso", label: "Curso" },
  { value: "video", label: "Vídeo" },
  { value: "podcast", label: "Podcast" },
  { value: "receita", label: "Receita" },
  { value: "procedimento", label: "Procedimento" },
  { value: "certificacao", label: "Certificação" },
  { value: "premio", label: "Prêmio" },
  { value: "depoimento", label: "Depoimento" },
  { value: "parceiro", label: "Parceiro" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "case", label: "Case de Sucesso" },
  { value: "portfolio", label: "Portfólio" },
  { value: "metodologia", label: "Metodologia" },
  { value: "ferramenta", label: "Ferramenta" },
  { value: "integracao", label: "Integração" },
  { value: "plano", label: "Plano / Pricing" },
  { value: "garantia", label: "Garantia" },
  { value: "frete", label: "Frete / Entrega" },
  { value: "politica", label: "Política" },
  { value: "idioma", label: "Idioma" },
  { value: "publico_alvo", label: "Público-Alvo" },
  { value: "nicho", label: "Nicho" },
];

export const SCHEMA_TYPES: Record<string, string[]> = {
  empresa: ["Organization", "Corporation", "LocalBusiness", "MedicalBusiness", "LegalService", "FinancialService", "HomeAndConstructionBusiness", "SportsActivityLocation"],
  produto: ["Product", "IndividualProduct", "ProductGroup", "Vehicle", "SoftwareApplication", "Book", "CreativeWork"],
  servico: ["Service", "ProfessionalService", "FinancialProduct", "GovernmentService", "BroadcastService", "CableOrSatelliteService"],
  local: ["Place", "LocalBusiness", "PostalAddress", "City", "Country", "State", "AdministrativeArea", "TouristAttraction"],
  pessoa: ["Person", "Patient"],
  site: ["WebSite", "WebPage", "SiteNavigationElement"],
  gbp: ["LocalBusiness", "Restaurant", "Dentist", "Physician", "AutoRepair", "BeautySalon", "HealthClub", "LodgingBusiness", "RealEstateAgent"],
  avaliacao: ["Review", "AggregateRating", "CriticReview", "UserReview"],
  evento: ["Event", "BusinessEvent", "SocialEvent", "EducationEvent", "MusicEvent", "SportsEvent", "Festival"],
  faq: ["FAQPage"],
  artigo: ["Article", "BlogPosting", "NewsArticle", "TechArticle", "ScholarlyArticle", "Report"],
  oferta: ["Offer", "AggregateOffer", "OfferShippingDetails"],
  marca: ["Brand"],
  categoria: ["Thing", "CategoryCode", "DefinedTerm", "Taxon"],
  imagem: ["ImageObject", "Photograph", "Barcode"],
  credencial: ["EducationalOccupationalCredential", "Certification"],
  pagina: ["WebPage", "AboutPage", "ContactPage", "CheckoutPage", "CollectionPage", "FAQPage", "ProfilePage", "SearchResultsPage"],
  busca: ["SearchAction"],
  pergunta: ["Question"],
  horario: ["OpeningHoursSpecification", "Schedule"],
  geo: ["GeoCoordinates", "GeoCircle", "GeoShape"],
  endereco: ["PostalAddress"],
  rating: ["Rating", "AggregateRating", "EndorsementRating"],
  organizacao: ["Organization", "NGO", "Consortium", "GovernmentOrganization"],
  especialidade: ["MedicalSpecialty", "Specialty", "DefinedTerm"],
  equipamento: ["Product", "MedicalDevice", "IndividualProduct"],
  conteudo: ["CreativeWork", "Article", "HowTo", "Recipe", "MediaObject", "BreadcrumbList", "AboutPage"],
  curso: ["Course", "CourseInstance", "EducationalOccupationalProgram"],
  video: ["VideoObject", "Clip", "Movie"],
  podcast: ["PodcastEpisode", "PodcastSeries", "RadioEpisode"],
  receita: ["Recipe", "HowTo"],
  procedimento: ["MedicalProcedure", "TherapeuticProcedure", "DiagnosticProcedure", "HowTo"],
  certificacao: ["Certification", "EducationalOccupationalCredential"],
  premio: ["CreativeWork", "Thing"],
  depoimento: ["Review", "Testimonial", "UserReview"],
  parceiro: ["Organization", "Corporation"],
  fornecedor: ["Organization", "Corporation"],
  case: ["CreativeWork", "Article", "Report"],
  portfolio: ["CreativeWork", "CollectionPage", "ImageGallery"],
  metodologia: ["HowTo", "CreativeWork", "DefinedTerm"],
  ferramenta: ["SoftwareApplication", "Product", "CreativeWork"],
  integracao: ["SoftwareApplication", "APIReference", "WebAPI"],
  plano: ["Offer", "AggregateOffer", "PriceSpecification"],
  garantia: ["WarrantyPromise", "OfferItemCondition"],
  frete: ["OfferShippingDetails", "DeliveryEvent", "ParcelDelivery"],
  politica: ["WebPage", "DigitalDocument"],
  idioma: ["Language"],
  publico_alvo: ["Audience", "PeopleAudience", "BusinessAudience"],
  nicho: ["DefinedTerm", "CategoryCode", "Thing"],
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
