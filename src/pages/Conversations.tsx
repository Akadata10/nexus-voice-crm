import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, User, Bot, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Conversation {
  id: string;
  chat_id: number;
  client_name: string | null;
  client_username: string | null;
  last_message_at: string | null;
  is_active: boolean;
}

interface Message {
  id: string;
  direction: string;
  content: string | null;
  created_at: string | null;
}

export default function Conversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [botInitialized, setBotInitialized] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["telegram_conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["telegram_messages", selectedConv?.id],
    queryFn: async () => {
      if (!selectedConv) return [];
      const { data, error } = await supabase
        .from("telegram_messages")
        .select("id, direction, content, created_at")
        .eq("conversation_id", selectedConv.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConv,
    refetchInterval: 3000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "telegram_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["telegram_conversations"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telegram_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["telegram_messages", selectedConv?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, selectedConv?.id]);

  const initBotMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "init_bot", user_id: user!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setBotInitialized(true);
      toast.success("Bot inicializado. Ahora activa el polling con el cron job.");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConv || !replyText.trim()) return;
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: {
          action: "send_message",
          chat_id: selectedConv.chat_id,
          message: replyText.trim(),
          user_id: user!.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["telegram_messages", selectedConv?.id] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
              <span className="text-gradient-primary">Conversaciones</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Inbox de Telegram con IA</p>
          </div>
          <Button size="sm" onClick={() => initBotMutation.mutate()} disabled={initBotMutation.isPending} className="bg-primary text-primary-foreground">
            <Power className="w-4 h-4 mr-1" /> {initBotMutation.isPending ? "..." : "Activar Bot"}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
          {/* Conversation List */}
          <div className="glass-card p-3 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Chats</span>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs ml-auto">{conversations.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConv?.id === conv.id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{conv.client_name || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.client_username ? `@${conv.client_username}` : ""}
                          {conv.last_message_at && ` · ${format(new Date(conv.last_message_at), "HH:mm", { locale: es })}`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && !isLoading && (
                  <p className="text-xs text-muted-foreground text-center py-8">No hay conversaciones aún. Activa el bot y envía un mensaje a tu bot de Telegram.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat View */}
          <div className="md:col-span-2 glass-card p-3 flex flex-col overflow-hidden">
            {selectedConv ? (
              <>
                <div className="flex items-center gap-2 pb-3 border-b border-border/30 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedConv.client_name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">Chat ID: {selectedConv.chat_id}</p>
                  </div>
                </div>
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                          msg.direction === "outgoing"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1 opacity-70">
                            {msg.direction === "incoming" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                            <span className="text-[10px]">
                              {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}
                  className="flex gap-2 pt-3 border-t border-border/30 mt-3"
                >
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="bg-secondary/50 border-border/50 text-sm"
                  />
                  <Button type="submit" size="icon" disabled={sendMutation.isPending || !replyText.trim()} className="bg-primary text-primary-foreground shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Selecciona una conversación</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
