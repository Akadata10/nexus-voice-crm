import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, GripVertical, Sparkles, Phone, Mail, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLUMNS = [
  { id: "lead", label: "Leads", color: "bg-primary/20 text-primary" },
  { id: "qualified", label: "Qualified", color: "bg-accent/20 text-accent" },
  { id: "meeting", label: "Meeting", color: "bg-[hsl(160,60%,45%)]/20 text-[hsl(160,60%,45%)]" },
  { id: "closed", label: "Closed", color: "bg-[hsl(280,60%,50%)]/20 text-[hsl(280,60%,50%)]" },
];

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  ai_summary: string | null;
  created_at: string | null;
}

export default function CRM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: { name: string; email: string; phone: string }) => {
      const { error } = await supabase.from("leads").insert({
        name: lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        user_id: user!.id,
        status: "lead",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setNewLead({ name: "", email: "", phone: "" });
      setDialogOpen(false);
      toast.success("Lead agregado");
    },
    onError: () => toast.error("Error al agregar lead"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast.error("Error al mover lead"),
  });

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);

  const handleDrop = useCallback(
    (columnId: string) => {
      if (draggedId) {
        updateStatusMutation.mutate({ id: draggedId, status: columnId });
        setDraggedId(null);
      }
    },
    [draggedId, updateStatusMutation]
  );

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search)
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
              CRM <span className="text-gradient-accent">Pipeline</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Gestiona tus leads con IA</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground h-9">
                  <Plus className="w-4 h-4 mr-1" /> Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border/50">
                <DialogHeader>
                  <DialogTitle className="font-display">Nuevo Lead</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newLead.name) addLeadMutation.mutate(newLead);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={newLead.name} onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))} className="bg-secondary/50 border-border/50" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))} className="bg-secondary/50 border-border/50" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))} className="bg-secondary/50 border-border/50" />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={addLeadMutation.isPending}>
                    {addLeadMutation.isPending ? "Guardando..." : "Agregar Lead"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Kanban Board - horizontal scroll on mobile */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-[800px]">
            {COLUMNS.map((col, colIdx) => {
              const colLeads = filtered.filter((l) => l.status === col.id);
              return (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: colIdx * 0.05 }}
                  className="flex-1 min-w-[200px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={`${col.color} text-xs font-medium`}>
                      {col.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{colLeads.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[200px] bg-secondary/10 rounded-xl p-2 border border-dashed border-border/30">
                    <AnimatePresence>
                      {colLeads.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          draggable
                          onDragStart={() => handleDragStart(lead.id)}
                          onDragEnd={handleDragEnd}
                          className={`glass-card-hover p-3 cursor-grab active:cursor-grabbing ${draggedId === lead.id ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground truncate">{lead.name}</span>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <div className="space-y-1 ml-[52px]">
                            {lead.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" /> <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" /> {lead.phone}
                              </div>
                            )}
                          </div>
                          {lead.ai_summary && (
                            <div className="mt-2 ml-[52px] flex items-start gap-1.5 bg-accent/5 border border-accent/10 rounded-lg p-2">
                              <Sparkles className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-relaxed">{lead.ai_summary}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {colLeads.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-8">
                        Arrastra leads aquí
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
