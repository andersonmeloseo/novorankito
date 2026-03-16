import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video, Play, PauseCircle, SkipForward, SkipBack, ArrowLeft,
  Trash2, Clock, Globe, Move, MousePointer2, ArrowDownFromLine,
  Loader2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function SessionReplayViewer({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["session-recordings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_recordings")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const [selectedRecording, setSelectedRecording] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPlayback = useCallback(() => {
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!selectedRecording) return;
    const events = selectedRecording.recording_data || [];
    if (!events.length) return;
    setIsPlaying(true);
    let idx = currentEventIdx;
    replayTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= events.length) { stopPlayback(); return; }
      setCurrentEventIdx(idx);
    }, Math.round(150 / playbackSpeed));
  }, [selectedRecording, stopPlayback, currentEventIdx, playbackSpeed]);

  useEffect(() => { return () => { if (replayTimerRef.current) clearInterval(replayTimerRef.current); }; }, []);

  useEffect(() => {
    if (isPlaying) { stopPlayback(); startPlayback(); }
  }, [playbackSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRecording = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error } = await supabase.from("session_recordings").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir gravação"); return; }
    toast.success("Gravação excluída");
    queryClient.invalidateQueries({ queryKey: ["session-recordings", projectId] });
    if (selectedRecording?.id === id) { setSelectedRecording(null); stopPlayback(); }
  }, [projectId, queryClient, selectedRecording, stopPlayback]);

  const deleteAllRecordings = useCallback(async () => {
    if (!window.confirm("Excluir TODAS as gravações de sessão deste projeto? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("session_recordings").delete().eq("project_id", projectId);
    if (error) { toast.error("Erro ao limpar gravações"); return; }
    toast.success("Todas as gravações foram excluídas");
    queryClient.invalidateQueries({ queryKey: ["session-recordings", projectId] });
    setSelectedRecording(null); stopPlayback();
  }, [projectId, queryClient, stopPlayback]);

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (recordings.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
          <Video className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h4 className="text-sm font-bold text-foreground mb-1">Nenhuma gravação de sessão ainda</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Atualize o Pixel Rankito para v3.4.0+ para capturar gravações de sessão automaticamente.
          As gravações incluem movimentos do mouse, cliques, scroll e mudanças na tela.
        </p>
      </Card>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "click": return <MousePointer2 className="h-2.5 w-2.5 text-destructive" />;
      case "scroll": return <ArrowDownFromLine className="h-2.5 w-2.5 text-warning" />;
      case "navigate": return <Globe className="h-2.5 w-2.5 text-info" />;
      default: return <Move className="h-2.5 w-2.5 text-muted-foreground" />;
    }
  };

  if (selectedRecording) {
    const events = selectedRecording.recording_data || [];
    const currentEvent = events[currentEventIdx];
    const clickEvents = events.filter((e: any) => e.type === "click");
    const scrollEvents = events.filter((e: any) => e.type === "scroll");
    const navEvents = events.filter((e: any) => e.type === "navigate");

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { stopPlayback(); setSelectedRecording(null); }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para lista
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive" onClick={() => deleteRecording(selectedRecording.id)}>
            <Trash2 className="h-3 w-3" /> Excluir
          </Button>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold font-display">Replay da Sessão</h4>
              <Badge variant="secondary" className="text-[9px]">{selectedRecording.session_id?.slice(-8)}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <MousePointer2 className="h-3 w-3 text-destructive" /> {clickEvents.length}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowDownFromLine className="h-3 w-3 text-warning" /> {scrollEvents.length}
              </div>
              {navEvents.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3 text-info" /> {navEvents.length}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {Math.round((selectedRecording.duration_ms || 0) / 1000)}s
              </div>
            </div>
          </div>

          {/* Replay viewport */}
          <div className="relative bg-muted/20 border border-border rounded-lg overflow-hidden" style={{ height: "400px" }}>
            <div className="absolute inset-0">
              {currentEvent ? (
                <div className="relative w-full h-full">
                  <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-muted-foreground">
                    {selectedRecording.page_url || "—"}
                  </div>
                  {currentEvent.x != null && currentEvent.y != null && (
                    <>
                      <div
                        className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-lg transition-all duration-100"
                        style={{
                          left: `${(currentEvent.x / (selectedRecording.screen_width || 1440)) * 100}%`,
                          top: `${(currentEvent.y / (selectedRecording.screen_height || 900)) * 100}%`,
                          background: currentEvent.type === "click" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                          transform: currentEvent.type === "click" ? "scale(1.5)" : "scale(1)",
                        }}
                      />
                      {currentEvent.type === "click" && (
                        <div
                          className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-destructive/50 animate-ping"
                          style={{
                            left: `${(currentEvent.x / (selectedRecording.screen_width || 1440)) * 100}%`,
                            top: `${(currentEvent.y / (selectedRecording.screen_height || 900)) * 100}%`,
                          }}
                        />
                      )}
                    </>
                  )}
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                    {getEventIcon(currentEvent.type || "move")}
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {currentEvent.type === "click" ? "Clique" : currentEvent.type === "scroll" ? "Scroll" : currentEvent.type === "navigate" ? "Navegação" : "Movimento"}
                      {currentEvent.tag && ` → <${currentEvent.tag}>`}
                      {currentEvent.text && ` "${currentEvent.text.slice(0, 40)}"`}
                      {currentEvent.url && ` → ${(() => { try { return new URL(currentEvent.url).pathname; } catch { return currentEvent.url; } })()}`}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-muted-foreground tabular-nums">
                    {currentEventIdx + 1} / {events.length}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Clique em Play para iniciar</p>
                </div>
              )}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { stopPlayback(); setCurrentEventIdx(Math.max(0, currentEventIdx - 10)); }}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={isPlaying ? stopPlayback : startPlayback}>
              {isPlaying ? <PauseCircle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pausar" : "Play"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { stopPlayback(); setCurrentEventIdx(Math.min(events.length - 1, currentEventIdx + 10)); }}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Select value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
              <SelectTrigger className="h-8 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5" className="text-xs">0.5×</SelectItem>
                <SelectItem value="1" className="text-xs">1×</SelectItem>
                <SelectItem value="2" className="text-xs">2×</SelectItem>
                <SelectItem value="4" className="text-xs">4×</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 mx-2">
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                stopPlayback();
                setCurrentEventIdx(Math.round(pct * (events.length - 1)));
              }}>
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${events.length ? (currentEventIdx / events.length) * 100 : 0}%` }} />
                {clickEvents.map((_: any, i: number) => {
                  const idx = events.indexOf(clickEvents[i]);
                  return <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-destructive/60" style={{ left: `${(idx / events.length) * 100}%` }} />;
                })}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{currentEventIdx + 1}/{events.length}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[8px]">{selectedRecording.device}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.browser}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.os}</Badge>
            <Badge variant="outline" className="text-[8px]">{selectedRecording.screen_width}×{selectedRecording.screen_height}</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold font-display">Gravações de Sessão</h4>
          <Badge variant="secondary" className="text-[9px]">{recordings.length} sessões</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={deleteAllRecordings}
        >
          <Trash2 className="h-3 w-3" /> Limpar todas
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recordings.map((rec: any) => {
          const date = new Date(rec.created_at);
          const events = (rec.recording_data as any[]) || [];
          const clickCount = events.filter((e: any) => e.type === "click").length;
          return (
            <Card key={rec.id} className="card-hover cursor-pointer group relative" onClick={() => setSelectedRecording(rec)}>
              <button
                className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center transition-colors hover:bg-destructive/10 hover:border-destructive/30"
                onClick={(e) => deleteRecording(rec.id, e)}
                title="Excluir gravação"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{rec.page_url ? (() => { try { return new URL(rec.page_url).pathname; } catch { return rec.page_url; } })() : "—"}</p>
                    <p className="text-[9px] text-muted-foreground">{date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[8px]">{rec.device || "—"}</Badge>
                  <Badge variant="outline" className="text-[8px]">{Math.round((rec.duration_ms || 0) / 1000)}s</Badge>
                  <Badge variant="outline" className="text-[8px]">{rec.events_count || 0} eventos</Badge>
                  {clickCount > 0 && <Badge variant="outline" className="text-[8px] border-destructive/30 text-destructive">{clickCount} cliques</Badge>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
