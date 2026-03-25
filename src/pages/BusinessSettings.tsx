import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, Save, Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export default function BusinessSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    business_name: "Mi Negocio",
    business_type: "general",
    description: "",
    phone: "",
    address: "",
    appointment_duration_minutes: 30,
    welcome_message: "¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?",
    bot_instructions: "Eres un asistente amable y profesional. Responde preguntas sobre el negocio, ayuda a agendar citas y envía recordatorios.",
    timezone: "Europe/Madrid",
    services: [] as string[],
    working_hours: {} as Record<string, { start: string; end: string; enabled: boolean }>,
  });
  const [newService, setNewService] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["business_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_config")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (config) {
      setForm({
        business_name: config.business_name || "Mi Negocio",
        business_type: config.business_type || "general",
        description: config.description || "",
        phone: config.phone || "",
        address: config.address || "",
        appointment_duration_minutes: config.appointment_duration_minutes || 30,
        welcome_message: config.welcome_message || "",
        bot_instructions: config.bot_instructions || "",
        timezone: config.timezone || "Europe/Madrid",
        services: (config.services as string[]) || [],
        working_hours: (config.working_hours as Record<string, { start: string; end: string; enabled: boolean }>) || {},
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("business_config")
        .upsert({
          user_id: user!.id,
          ...form,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_config"] });
      toast.success("Configuración guardada");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const addService = () => {
    if (newService.trim()) {
      setForm((p) => ({ ...p, services: [...p.services, newService.trim()] }));
      setNewService("");
    }
  };

  const removeService = (idx: number) => {
    setForm((p) => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  };

  const updateHours = (day: string, field: string, value: string | boolean) => {
    setForm((p) => ({
      ...p,
      working_hours: {
        ...p.working_hours,
        [day]: { ...p.working_hours[day], [field]: value },
      },
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
            Configuración del <span className="text-gradient-accent">Negocio</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Define tu negocio y personaliza el bot de IA</p>
        </motion.div>

        {/* Business Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Información del Negocio</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nombre del negocio</Label><Input value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
            <div><Label>Tipo de negocio</Label><Input value={form.business_type} onChange={(e) => setForm((p) => ({ ...p, business_type: e.target.value }))} placeholder="clínica, barbería, consultora..." className="bg-secondary/50 border-border/50" /></div>
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
            <div><Label>Duración estándar (min)</Label><Input type="number" value={form.appointment_duration_minutes} onChange={(e) => setForm((p) => ({ ...p, appointment_duration_minutes: parseInt(e.target.value) || 30 }))} className="bg-secondary/50 border-border/50" /></div>
          </div>
          <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="bg-secondary/50 border-border/50" /></div>
          <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="bg-secondary/50 border-border/50" placeholder="Describe tu negocio, servicios principales, etc." /></div>
        </motion.div>

        {/* Services */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 md:p-6 space-y-4">
          <h2 className="font-display font-semibold text-foreground">Servicios</h2>
          <div className="flex gap-2">
            <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Ej: Consulta general" className="bg-secondary/50 border-border/50" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())} />
            <Button onClick={addService} size="sm" variant="outline" className="border-border/50 shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.services.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-secondary/50 text-foreground text-xs px-3 py-1.5 rounded-full border border-border/30">
                {s}
                <button onClick={() => removeService(i)}><Trash2 className="w-3 h-3 text-destructive" /></button>
              </span>
            ))}
            {form.services.length === 0 && <p className="text-xs text-muted-foreground">Agrega servicios para que el bot pueda informar a los clientes</p>}
          </div>
        </motion.div>

        {/* Working Hours */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="font-display font-semibold text-foreground">Horario de Atención</h2>
          </div>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = form.working_hours[key] || { start: "09:00", end: "18:00", enabled: true };
              return (
                <div key={key} className="flex items-center gap-3 py-2">
                  <Switch checked={day.enabled} onCheckedChange={(v) => updateHours(key, "enabled", v)} />
                  <span className={`w-24 text-sm ${day.enabled ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  {day.enabled && (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={day.start} onChange={(e) => updateHours(key, "start", e.target.value)} className="w-28 h-8 text-xs bg-secondary/50 border-border/50" />
                      <span className="text-muted-foreground text-xs">a</span>
                      <Input type="time" value={day.end} onChange={(e) => updateHours(key, "end", e.target.value)} className="w-28 h-8 text-xs bg-secondary/50 border-border/50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Bot Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Configuración del Bot IA</h2>
          </div>
          <div><Label>Mensaje de bienvenida</Label><Textarea value={form.welcome_message} onChange={(e) => setForm((p) => ({ ...p, welcome_message: e.target.value }))} rows={2} className="bg-secondary/50 border-border/50" /></div>
          <div><Label>Instrucciones del bot (System Prompt)</Label><Textarea value={form.bot_instructions} onChange={(e) => setForm((p) => ({ ...p, bot_instructions: e.target.value }))} rows={5} className="bg-secondary/50 border-border/50" placeholder="Define la personalidad y comportamiento del bot..." /></div>
        </motion.div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full h-11 bg-primary text-primary-foreground text-sm font-medium">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </AppLayout>
  );
}
