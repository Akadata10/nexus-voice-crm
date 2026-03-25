import { motion } from "framer-motion";

interface VoiceWaveProps {
  isActive: boolean;
  barCount?: number;
}

export function VoiceWave({ isActive, barCount = 24 }: VoiceWaveProps) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: barCount }).map((_, i) => {
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const maxHeight = isActive ? 48 - centerDistance * 30 : 6;
        const minHeight = isActive ? 6 : 4;

        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              background: isActive
                ? `linear-gradient(to top, hsl(221, 69%, 33%), hsl(38, 92%, 50%))`
                : `hsl(0, 0%, 25%)`,
            }}
            animate={{
              height: isActive
                ? [minHeight, maxHeight, minHeight]
                : [minHeight, minHeight + 2, minHeight],
            }}
            transition={{
              duration: isActive ? 0.6 + Math.random() * 0.4 : 1.5,
              repeat: Infinity,
              delay: i * 0.04,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
