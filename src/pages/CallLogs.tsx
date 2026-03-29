import { motion } from "framer-motion";
import { Phone, Clock, ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CallLogs() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["call_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = logs.filter(
    (l) =>
      l.vapi_call_id?.toLowerCase().includes(search.toLowerCase()) ||
      l.status?.toLowerCase().includes(search.toLowerCase()) ||
      l.sentiment?.toLowerCase().includes(search.toLowerCase())
  );

  const sentimentColor = (s: string | null) => {
    if (s === "positive") return "bg-[hsl(160,60%,45%)]/20 text-[hsl(160,60%,45%)]";
    if (s === "negative") return "bg-destructive/20 text-destructive";
    return "bg-primary/20 text-primary";
  };

  const statusColor = (s: string | null) => {
    if (s === "completed") return "bg-[hsl(160,60%,45%)]/20 text-[hsl(160,60%,45%)]";
    if (s === "in_progress") return "bg-accent/20 text-accent";
    return "bg-secondary text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
              Call <span className="text-gradient-primary">Logs</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Historial completo de llamadas</p>
          </div>
          <div className="relative sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm" />
          </div>
        </motion.div>

        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-12">Cargando...</p>}
          {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No hay registros de llamadas aún</p>}
          {filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card-hover p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{log.vapi_call_id || "Llamada"}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.created_at ? format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: es }) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={statusColor(log.status)}>
                  {log.status || "initiated"}
                </Badge>
                {log.sentiment && (
                  <Badge variant="secondary" className={sentimentColor(log.sentiment)}>
                    {log.sentiment}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {log.duration_seconds ? `${Math.floor(log.duration_seconds / 60)}:${String(log.duration_seconds % 60).padStart(2, "0")}` : "0:00"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
