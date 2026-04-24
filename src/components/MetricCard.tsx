import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon?: ReactNode;
  delay?: number;
}

export function MetricCard({ label, value, suffix = "", prefix = "", decimals = 0, icon, delay = 0 }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, delay]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">
        {prefix}{formatted}{suffix}
      </div>
    </motion.div>
  );
}
