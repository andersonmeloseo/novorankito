import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react";

interface ApiKeysSettingsProps {
  projectId: string;
}

export function ApiKeysSettings({ projectId }: ApiKeysSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("Default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate a random API key
      const rawKey = `rk_${crypto.randomUUID().replace(/-/g, "")}`;
      const prefix = rawKey.substring(0, 8);

      // Hash for storage
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const { error } = await supabase.from("api_keys").insert({
        owner_id: user!.id,
        project_id: projectId,
        key_hash: keyHash,
        key_prefix: prefix,
        name: newKeyName,
        scopes: ["read"],
      });

      if (error) throw error;
      return rawKey;
    },
    onSuccess: (key) => {
      setGeneratedKey(key);
      setShowKey(true);
      toast({ title: "API Key criada!", description: "Copie a chave agora — ela não será exibida novamente." });
      qc.invalidateQueries({ queryKey: ["api-keys", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chave removida" });
      qc.invalidateQueries({ queryKey: ["api-keys", projectId] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Key className="h-4 w-4" />
          API Keys
        </CardTitle>
        <CardDescription className="text-xs">
          Gerencie chaves de acesso à API pública do seu projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new key */}
        <div className="flex gap-2">
          <Input className="h-8 text-sm flex-1" placeholder="Nome da chave" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Criar
          </Button>
        </div>

        {/* Show generated key */}
        {generatedKey && (
          <div className="p-3 rounded-lg bg-muted border border-primary/30 space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium">⚠️ Copie agora — esta chave não será exibida novamente:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate font-mono">
                {showKey ? generatedKey : "••••••••••••••••••••"}
              </code>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(generatedKey)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* List existing keys */}
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : keys.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma API key criada ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{k.name}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">{k.key_prefix}••••</code>
                  <Badge variant={k.is_active ? "secondary" : "destructive"} className="text-[10px]">
                    {k.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {k.last_used_at && (
                    <span className="text-[10px] text-muted-foreground">
                      Último uso: {new Date(k.last_used_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(k.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
