import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Phone, PhoneCall, TrendingUp, Users, Clock, Zap, PhoneOutgoing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { VoiceWave } from "@/components/dashboard/VoiceWave";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { CallSimulation } from "@/components/dashboard/CallSimulation";
import { useSimulateCall } from "@/hooks/useSimulateCall";

interface Call {
  id: string;
  name: string;
  type: "incoming" | "outgoing";
  duration: string;
  status: "active" | "completed" | "ringing";
}

const initialCalls: Call[] = [
  { id: "1", name: "Sarah Chen", type: "incoming", duration: "2:34", status: "active" },
  { id: "2", name: "Marcus Rivera", type: "incoming", duration: "0:00", status: "ringing" },
];

export default function Index() {
  const [agentActive, setAgentActive] = useState(true);
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const { isLoading, simulateCall } = useSimulateCall();

  const handleAnswer = useCallback((id: string) => {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "active" as const } : c)));
  }, []);

  const handleEnd = useCallback((id: string) => {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "completed" as const } : c)));
  }, []);

  const handleStartCall = useCallback(async () => {
    const result = await simulateCall();
    if (result?.call_log) {
      setCalls((prev) => [
        {
          id: result.call_log.id,
          name: "Vapi AI Call",
          type: "outgoing",
          duration: "0:00",
          status: "active",
        },
        ...prev,
      ]);
    }
  }, [simulateCall]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
            Voice Agent <span className="text-gradient-primary">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Monitorea y controla tus agentes de voz IA en tiempo real</p>
        </motion.div>

        {/* Stats Grid - 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatusCard icon={PhoneCall} label="Llamadas Activas" value="3" trend="+12%" />
          <StatusCard icon={Users} label="Leads Hoy" value="47" trend="+8%" accentColor="accent" />
          <StatusCard icon={Clock} label="Duración Prom." value="4:23" />
          <StatusCard icon={TrendingUp} label="Conversión" value="34%" trend="+5%" accentColor="accent" />
        </div>

        {/* Main Grid - stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Voice Agent Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-4 md:p-6"
          >
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h2 className="font-display font-semibold text-foreground text-base md:text-lg">Control del Agente</h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Monitoreo de actividad de voz</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agentActive ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{agentActive ? "En vivo" : "Offline"}</span>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
              <VoiceWave isActive={agentActive} barCount={16} />
            </div>

            {/* Buttons - stack on mobile */}
            <div className="flex flex-col gap-2 md:flex-row md:gap-3">
              <Button
                onClick={() => setAgentActive(!agentActive)}
                className={`flex-1 h-10 md:h-11 text-sm font-medium ${
                  agentActive
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                variant="ghost"
              >
                {agentActive ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {agentActive ? "Detener Agente" : "Iniciar Agente"}
              </Button>

              <Button
                onClick={handleStartCall}
                disabled={isLoading || !agentActive}
                className="flex-1 h-10 md:h-11 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <PhoneOutgoing className="w-4 h-4 mr-2" />
                {isLoading ? "Conectando..." : "Iniciar Llamada"}
              </Button>

              <Button variant="outline" className="flex-1 h-10 md:h-11 text-sm border-border/50 text-foreground hover:bg-secondary/50">
                <Zap className="w-4 h-4 mr-2 text-accent" />
                Entrenamiento
              </Button>
            </div>
          </motion.div>

          {/* Live Calls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 md:p-5"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-display font-semibold text-foreground text-base">Llamadas</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {calls.filter((c) => c.status !== "completed").length} activas
              </span>
            </div>
            <CallSimulation calls={calls} onAnswer={handleAnswer} onEnd={handleEnd} />
          </motion.div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4 md:p-5"
          >
            <h3 className="font-display font-semibold text-foreground mb-3 text-sm md:text-base">Presupuesto de Llamadas</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Presupuesto mensual</span>
                <span className="text-foreground font-medium">$2,400 / $5,000</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: "48%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">1,247 minutos usados de 2,600</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4 md:p-5"
          >
            <h3 className="font-display font-semibold text-foreground mb-3 text-sm md:text-base">Rendimiento IA</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-xl md:text-2xl font-display font-bold text-foreground">92%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Precisión Intento</p>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-display font-bold text-accent">4.7</p>
                <p className="text-xs text-muted-foreground mt-0.5">Satisfacción</p>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-display font-bold text-foreground">1.2s</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tiempo Respuesta</p>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-display font-bold text-primary">87%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Resolución</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
