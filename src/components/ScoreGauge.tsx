import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  score: number; // 300..900
  size?: number;
  animated?: boolean;
}

const MIN = 300;
const MAX = 900;

const ZONES = [
  { from: 300, to: 450, color: "hsl(var(--score-very-poor))" },
  { from: 450, to: 550, color: "hsl(var(--score-poor))" },
  { from: 550, to: 650, color: "hsl(var(--score-fair))" },
  { from: 650, to: 750, color: "hsl(var(--score-good))" },
  { from: 750, to: 900, color: "hsl(var(--score-excellent))" },
];

// Gauge spans from 180° (left) to 0° (right) — semicircle
const START_ANGLE = 180;
const END_ANGLE = 360; // sweeping 180° clockwise from left to right

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function valueToAngle(v: number) {
  const t = (Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN);
  return START_ANGLE + t * (END_ANGLE - START_ANGLE);
}

export function ScoreGauge({ score, size = 320, animated = true }: Props) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 24;
  const stroke = 22;

  const [display, setDisplay] = useState(animated ? MIN : score);
  const angleMV = useMotionValue(animated ? START_ANGLE : valueToAngle(score));
  const needleRotate = useTransform(angleMV, (a) => `rotate(${a - 90} ${cx} ${cy})`);

  useEffect(() => {
    if (!animated) {
      setDisplay(score);
      angleMV.set(valueToAngle(score));
      return;
    }
    const controls = animate(MIN, score, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        setDisplay(Math.round(v));
        angleMV.set(valueToAngle(v));
      },
    });
    return () => controls.stop();
  }, [score, animated, angleMV]);

  const tip = polar(cx, cy, r - stroke / 2, valueToAngle(score));

  return (
    <div className="relative" style={{ width: size, height: size * 0.7 }}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <defs>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={arcPath(cx, cy, r, START_ANGLE, END_ANGLE)}
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          opacity={0.4}
        />

        {/* Colored zones */}
        {ZONES.map((z) => (
          <path
            key={z.from}
            d={arcPath(cx, cy, r, valueToAngle(z.from), valueToAngle(z.to))}
            stroke={z.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            fill="none"
            opacity={0.95}
          />
        ))}

        {/* Tick labels */}
        {[300, 450, 600, 750, 900].map((v) => {
          const p = polar(cx, cy, r + 22, valueToAngle(v));
          return (
            <text
              key={v}
              x={p.x}
              y={p.y}
              fontSize={11}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              dominantBaseline="middle"
            >
              {v}
            </text>
          );
        })}

        {/* Needle */}
        <motion.g style={{ transform: needleRotate as any }}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - (r - stroke / 2 - 6)}
            stroke="hsl(var(--accent))"
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#needleGlow)"
          />
          <circle cx={cx} cy={cy} r={10} fill="hsl(var(--accent))" />
          <circle cx={cx} cy={cy} r={4} fill="hsl(var(--background))" />
        </motion.g>

        {/* Tip dot at final position (subtle marker) */}
        <circle cx={tip.x} cy={tip.y} r={3} fill="hsl(var(--foreground))" opacity={0.8} />
      </svg>

      <div
        className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
        style={{ top: size * 0.45 }}
      >
        <div className="font-display text-5xl font-bold tabular-nums">{display}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Credit Score</div>
      </div>
    </div>
  );
}
