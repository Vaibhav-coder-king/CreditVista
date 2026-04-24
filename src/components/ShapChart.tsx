import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShapMap } from "@/lib/types";

interface Props {
  shap: ShapMap;
}

export function ShapChart({ shap }: Props) {
  const data = Object.entries(shap)
    .map(([feature, value]) => ({ feature, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-[420px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <XAxis
            type="number"
            domain={[-max, max]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            dataKey="feature"
            type="category"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            width={170}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeOpacity={0.4} />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--foreground))",
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(1)} pts`, "Impact"]}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} animationDuration={900}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
