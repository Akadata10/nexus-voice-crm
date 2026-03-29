import { motion } from "framer-motion";
import { TrendingUp, PhoneCall, Clock, Target, DollarSign, BarChart3 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusCard } from "@/components/dashboard/StatusCard";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const callData = [
  { day: "Lun", llamadas: 24, convertidas: 8 },
  { day: "Mar", llamadas: 31, convertidas: 12 },
  { day: "Mié", llamadas: 28, convertidas: 9 },
  { day: "Jue", llamadas: 42, convertidas: 18 },
  { day: "Vie", llamadas: 38, convertidas: 14 },
  { day: "Sáb", llamadas: 15, convertidas: 5 },
  { day: "Dom", llamadas: 8, convertidas: 3 },
];

const durationData = [
  { range: "0-2 min", count: 34 },
  { range: "2-5 min", count: 56 },
  { range: "5-10 min", count: 28 },
  { range: "10+ min", count: 12 },
];

const sentimentData = [
  { name: "Positivo", value: 58, color: "hsl(160, 60%, 45%)" },
  { name: "Neutral", value: 28, color: "hsl(221, 69%, 50%)" },
  { name: "Negativo", value: 14, color: "hsl(0, 72%, 51%)" },
];

const roiData = [
  { month: "Ene", inversion: 2000, retorno: 5200 },
  { month: "Feb", inversion: 2200, retorno: 6100 },
  { month: "Mar", inversion: 2400, retorno: 7800 },
  { month: "Abr", inversion: 2100, retorno: 6400 },
  { month: "May", inversion: 2600, retorno: 9200 },
  { month: "Jun", inversion: 2800, retorno: 10500 },
];

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(0, 0%, 9%)",
    border: "1px solid hsl(0, 0%, 16%)",
    borderRadius: "0.75rem",
    fontSize: "0.75rem",
    color: "hsl(0, 0%, 95%)",
  },
};

export default function Analytics() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
            <span className="text-gradient-primary">Analytics</span> Dashboard
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Métricas de rendimiento y ROI de tus agentes</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusCard icon={PhoneCall} label="Total Llamadas" value="186" trend="+23%" />
          <StatusCard icon={Target} label="Tasa Conversión" value="34%" trend="+5%" accentColor="accent" />
          <StatusCard icon={Clock} label="Duración Prom." value="4:23" />
          <StatusCard icon={DollarSign} label="ROI" value="312%" trend="+18%" accentColor="accent" />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calls per day */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground text-sm md:text-base">Llamadas por Día</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={callData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="llamadas" fill="hsl(221, 69%, 33%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="convertidas" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ROI over time */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="font-display font-semibold text-foreground text-sm md:text-base">ROI Mensual</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="retorno" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="inversion" stroke="hsl(221, 69%, 50%)" fill="hsl(221, 69%, 50%)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Duration distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground text-sm md:text-base">Distribución Duración</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={durationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                <XAxis type="number" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                <YAxis dataKey="range" type="category" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} width={70} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(221, 69%, 40%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Sentiment */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-accent" />
              <h3 className="font-display font-semibold text-foreground text-sm md:text-base">Sentimiento Llamadas</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" strokeWidth={0}>
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
