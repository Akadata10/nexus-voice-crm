import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, User, Phone, Plus, CheckCircle, XCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_telegram_chat_id: number | null;
  service: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string | null;
  notes: string | null;
  reminder_sent: boolean | null;
}

export default function Appointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", client_phone: "", service: "", date: "", time: "", duration: "30" });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = `${form.date}T${form.time}:00`;
      const { error } = await supabase.from("appointments").insert({
        user_id: user!.id,
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        service: form.service || null,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(form.duration),
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setForm({ client_name: "", client_phone: "", service: "", date: "", time: "", duration: "30" });
      setDialogOpen(false);
      toast.success("Cita creada");
    },
    onError: () => toast.error("Error al crear cita"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (appt: Appointment) => {
      if (!appt.client_telegram_chat_id) {
        toast.error("Este cliente no tiene chat de Telegram vinculado");
        return;
      }
      const dateStr = format(new Date(appt.scheduled_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
      const message = `📅 <b>Recordatorio de cita</b>\n\nHola ${appt.client_name}, te recordamos tu cita:\n\n📋 Servicio: ${appt.service || "General"}\n🕐 Fecha: ${dateStr}\n⏱ Duración: ${appt.duration_minutes} min\n\n¿Confirmas tu asistencia? Responde Sí o No.`;

      const { error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "send_notification", chat_id: appt.client_telegram_chat_id, message },
      });
      if (error) throw error;

      await supabase.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Recordatorio enviado");
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const statusColor = (s: string | null) => {
    if (s === "confirmed") return "bg-[hsl(160,60%,45%)]/20 text-[hsl(160,60%,45%)]";
    if (s === "cancelled") return "bg-destructive/20 text-destructive";
    if (s === "completed") return "bg-primary/20 text-primary";
    return "bg-secondary text-muted-foreground";
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter((a) => a.scheduled_at >= today && a.status !== "cancelled");
  const past = appointments.filter((a) => a.scheduled_at < today || a.status === "cancelled");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
              <span className="text-gradient-accent">Citas</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Gestiona las citas de tu negocio</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground h-9">
                <Plus className="w-4 h-4 mr-1" /> Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50">
              <DialogHeader>
                <DialogTitle className="font-display">Nueva Cita</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-3">
                <div><Label>Cliente *</Label><Input value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
                <div><Label>Teléfono</Label><Input value={form.client_phone} onChange={(e) => setForm((p) => ({ ...p, client_phone: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
                <div><Label>Servicio</Label><Input value={form.service} onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fecha *</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
                  <div><Label>Hora *</Label><Input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
                </div>
                <div><Label>Duración (min)</Label>
                  <Select value={form.duration} onValueChange={(v) => setForm((p) => ({ ...p, duration: v }))}>
                    <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="15">15 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="45">45 min</SelectItem><SelectItem value="60">60 min</SelectItem><SelectItem value="90">90 min</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground" disabled={addMutation.isPending || !form.client_name || !form.date || !form.time}>
                  {addMutation.isPending ? "Guardando..." : "Crear Cita"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Upcoming */}
        <div>
          <h2 className="font-display font-semibold text-foreground text-sm mb-3">Próximas ({upcoming.length})</h2>
          <div className="space-y-2">
            {upcoming.map((appt, i) => (
              <motion.div key={appt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card-hover p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{appt.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.scheduled_at), "EEEE d MMM, HH:mm", { locale: es })}
                        {appt.service && ` · ${appt.service}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={statusColor(appt.status)}>{appt.status}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{appt.duration_minutes}min</div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => sendReminderMutation.mutate(appt)} title="Enviar recordatorio">
                        <Bell className="w-3.5 h-3.5 text-accent" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "completed" })} title="Completar">
                        <CheckCircle className="w-3.5 h-3.5 text-[hsl(160,60%,45%)]" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "cancelled" })} title="Cancelar">
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay citas próximas</p>}
          </div>
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-muted-foreground text-sm mb-3">Pasadas ({past.length})</h2>
            <div className="space-y-2 opacity-60">
              {past.slice(0, 10).map((appt) => (
                <div key={appt.id} className="glass-card p-3 flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{appt.client_name} — {appt.service || "General"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(appt.scheduled_at), "d MMM, HH:mm", { locale: es })}</p>
                  </div>
                  <Badge variant="secondary" className={statusColor(appt.status)}>{appt.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
