import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  accentColor?: "primary" | "accent";
}

export function StatusCard({ icon: Icon, label, value, trend, accentColor = "primary" }: StatusCardProps) {
  const glowClass = accentColor === "accent" ? "glow-accent" : "glow-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentColor === "accent" ? "bg-accent/10" : "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accentColor === "accent" ? "text-accent" : "text-primary"}`} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}
