import { motion } from "framer-motion";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stack = ["XGBoost", "SHAP", "pdfplumber", "pdf.js", "React + TS", "Recharts", "Framer Motion", "RBI AA Framework"];

const flow = [
  { label: "User profile", x: 60 },
  { label: "PDF upload", x: 220 },
  { label: "Parser", x: 380 },
  { label: "Feature engineering", x: 540 },
  { label: "XGBoost model", x: 720 },
  { label: "SHAP explainer", x: 880 },
  { label: "Score + tips", x: 1040 },
];

const radarData = [
  { signal: "Income\nConsistency", score: 78 },
  { signal: "Savings", score: 62 },
  { signal: "Bill\nPayments", score: 84 },
  { signal: "Digital\nUsage", score: 70 },
  { signal: "EMI\nBurden", score: 45 },
  { signal: "Cash\nHabit", score: 55 },
];

export default function About() {
  return (
    <div className="container py-12 md:py-16 space-y-20">
      {/* Problem */}
      <section className="grid md:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
            <Users className="h-3 w-3" /> The credit gap
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold leading-tight">
            190 million Indians are <span className="text-gradient-gold">credit-invisible</span>.
          </h1>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Gig workers, daily wage earners, freelancers, small shop owners, women without
            independent banking history — the Indian formal credit system simply has no record of them.
            That doesn't make them risky. It makes them invisible.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { stat: "190M+", label: "Credit-invisible Indians" },
            { stat: "63%", label: "Of gig workers rejected for formal loans" },
            { stat: "₹1,400Cr", label: "Annual MSME credit gap" },
            { stat: "0", label: "CIBIL pulls Credit Vista performs" },
          ].map((c, i) => (
            <div key={i} className="glass-card p-5">
              <div className="font-display text-3xl font-bold text-gradient-gold">{c.stat}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Architecture diagram */}
      <section>
        <h2 className="font-display text-3xl font-bold text-center">How the model works</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">
          A fully explainable pipeline — from a raw PDF to an actionable score in seconds.
        </p>

        <div className="glass-card mt-8 p-6 overflow-x-auto">
          <svg viewBox="0 0 1140 200" className="w-full min-w-[900px] h-[200px]">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            {flow.map((node, i) => (
              <g key={node.label}>
                <rect
                  x={node.x - 60}
                  y={70}
                  width={120}
                  height={60}
                  rx={10}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--primary) / 0.6)"
                />
                <text
                  x={node.x}
                  y={104}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize={12}
                  fontWeight={600}
                >
                  {node.label}
                </text>
                {i < flow.length - 1 && (
                  <line
                    x1={node.x + 60}
                    y1={100}
                    x2={flow[i + 1].x - 62}
                    y2={100}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    markerEnd="url(#arrow)"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* Tech stack */}
      <section>
        <h2 className="font-display text-3xl font-bold text-center">Technology</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {stack.map((t) => (
            <span key={t} className="px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-sm">{t}</span>
          ))}
        </div>
      </section>

      {/* Radar */}
      <section className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-display text-3xl font-bold">Six dimensions of behavioural credit</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Every Credit Vista score is built from six interpretable behavioural dimensions —
            each one independently auditable, each one shown back to you with its contribution.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/30 text-sm">
            <ShieldCheck className="h-4 w-4 text-success" />
            Bias-audited across rural / urban and ₹5K–₹5L income groups.
          </div>
        </div>
        <div className="glass-card p-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="signal" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Radar
                name="Sample"
                dataKey="score"
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent))"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="glass-card p-8 max-w-3xl mx-auto text-center">
        <h3 className="font-display text-xl font-semibold">Disclaimer</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Credit Vista is a demonstration prototype for InnovFest 2026. Scores are generated from
          behavioural signals on synthetic or user-uploaded data and do not constitute official
          credit assessments. No data is transmitted off-device.
        </p>
        <Button asChild variant="gold" className="mt-6">
          <Link to="/score">Try it now <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </section>
    </div>
  );
}
