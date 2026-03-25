import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Call {
  id: string;
  name: string;
  type: "incoming" | "outgoing";
  duration: string;
  status: "active" | "completed" | "ringing";
}

interface CallSimulationProps {
  calls: Call[];
  onAnswer?: (id: string) => void;
  onEnd?: (id: string) => void;
}

export function CallSimulation({ calls, onAnswer, onEnd }: CallSimulationProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {calls.map((call) => (
          <motion.div
            key={call.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`glass-card p-4 flex items-center justify-between ${
              call.status === "active" ? "border-primary/30" : call.status === "ringing" ? "border-accent/30" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                call.status === "active" ? "bg-primary/20" :
                call.status === "ringing" ? "bg-accent/20 animate-pulse" :
                "bg-muted"
              }`}>
                {call.type === "incoming" ? (
                  <PhoneIncoming className={`w-4 h-4 ${call.status === "ringing" ? "text-accent" : "text-primary"}`} />
                ) : (
                  <Phone className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{call.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{call.duration}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    call.status === "active" ? "bg-primary/10 text-primary" :
                    call.status === "ringing" ? "bg-accent/10 text-accent" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {call.status === "ringing" && (
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs" onClick={() => onAnswer?.(call.id)}>
                  Answer
                </Button>
              )}
              {(call.status === "active" || call.status === "ringing") && (
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 text-xs" onClick={() => onEnd?.(call.id)}>
                  <PhoneOff className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {calls.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No active calls
        </div>
      )}
    </div>
  );
}
