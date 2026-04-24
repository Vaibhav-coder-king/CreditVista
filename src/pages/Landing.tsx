import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  ArrowRight,
  BrainCircuit,
  ChartBar,
  CheckCircle2,
  FileScan,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    icon: FileScan,
    title: "Upload, we extract",
    body:
      "Drop your bank statement PDF. Credit Vista auto-extracts 9 behavioural signals — UPI activity, bill discipline, savings rhythm, EMI burden — without storing raw data.",
  },
  {
    icon: BrainCircuit,
    title: "Behavioural ML, not CIBIL",
    body:
      "An XGBoost-style model trained on real-world spending patterns of gig workers, freelancers and self-employed Indians — not on legacy bureau data.",
  },
  {
    icon: ChartBar,
    title: "SHAP-explained, every time",
    body:
      "See exactly which signals lifted your score and which pulled it down. Every recommendation is grounded in an explainable model output.",
  },
];

const steps = [
  { n: 1, title: "Tell us about you", body: "Name, employment type and declared monthly income." },
  { n: 2, title: "Upload statement", body: "Drag-and-drop a PDF, PNG or JPG of your last 3–6 months." },
  { n: 3, title: "AI parses 9 signals", body: "UPI, bills, savings, EMI, cash, streaks — all in seconds." },
  { n: 4, title: "Score in 10 seconds", body: "Get your 300–900 score with a full SHAP explanation." },
];

const demos = [
  {
    name: "Ravi",
    age: 28,
    role: "Swiggy delivery partner",
    score: 74,
    risk: "Low Risk",
    color: "success",
    bars: [
      { label: "Income Consistency", v: 0.85, sign: 1 },
      { label: "Digital Payment Usage", v: 0.78, sign: 1 },
      { label: "Cash Withdrawal Habit", v: 0.55, sign: -1 },
    ],
  },
  {
    name: "Priya",
    age: 34,
    role: "Freelance designer",
    score: 61,
    risk: "Medium Risk",
    color: "warning",
    bars: [
      { label: "Savings Habit", v: 0.7, sign: 1 },
      { label: "Bills Paid On Time", v: 0.6, sign: 1 },
      { label: "Income Consistency", v: 0.65, sign: -1 },
    ],
  },
  {
    name: "Suresh",
    age: 45,
    role: "Irregular income",
    score: 38,
    risk: "High Risk",
    color: "destructive",
    bars: [
      { label: "EMI/Loan Burden", v: 0.8, sign: -1 },
      { label: "Cash Withdrawal Habit", v: 0.7, sign: -1 },
      { label: "Income Consistency", v: 0.45, sign: -1 },
    ],
  },
];

const trustBadges = [
  { icon: Users, label: "190M+ Credit-Invisible Indians" },
  { icon: ShieldCheck, label: "RBI AA Framework Compatible" },
  { icon: Sparkles, label: "SHAP Explainable AI" },
  { icon: Lock, label: "100% Data Privacy" },
];

export default function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
        <div className="container relative pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/40 bg-accent/10 text-accent text-xs font-semibold tracking-wide">
              <Sparkles className="h-3 w-3" /> InnovFest 2026 · Alternative Credit Scoring
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.05] tracking-tight">
              Banks rejected Ravi.<br />
              Not because he's risky.<br />
              <span className="text-gradient-gold">Because he's invisible.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Credit Vista uses AI to build your financial identity from UPI history, bill payments,
              and spending patterns — no CIBIL score needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link to="/score">Get My Free Score <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline-blue" size="lg">
                <Link to="/about">See How It Works</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute -inset-10 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative float-anim">
                <ScoreGauge score={742} size={380} />
              </div>
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Live demo · GOOD tier
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust badges */}
        <div className="container pb-10">
          <div className="glass-card grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-accent shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Built for the 190 million who don't fit a CIBIL form.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Three core capabilities — explainable end-to-end.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="glass-card glass-card-hover p-7"
            >
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30 mb-5">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold">From statement to score in 4 steps.</h2>
          <p className="mt-4 text-muted-foreground">No CIBIL. No bank API. No paperwork.</p>
        </div>

        <div className="mt-14 relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-accent/60" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="relative mx-auto h-14 w-14 rounded-full bg-card border-2 border-primary grid place-items-center font-display text-xl font-bold text-primary glow-primary">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO PROFILES */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Real-world profiles, real explanations.</h2>
          <p className="mt-4 text-muted-foreground">Three illustrative users from the credit-invisible economy.</p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {demos.map((d) => {
            const colorMap = {
              success: "text-success border-success/40 bg-success/10",
              warning: "text-warning border-warning/40 bg-warning/10",
              destructive: "text-destructive border-destructive/40 bg-destructive/10",
            } as const;
            return (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="glass-card glass-card-hover p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-xl font-bold">{d.name}, {d.age}</div>
                    <div className="text-sm text-muted-foreground">{d.role}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${colorMap[d.color as keyof typeof colorMap]}`}>
                    {d.risk}
                  </div>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold tabular-nums">{d.score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>

                <div className="mt-5 space-y-2.5">
                  {d.bars.map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className={b.sign > 0 ? "text-success" : "text-destructive"}>
                          {b.sign > 0 ? "+" : "−"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.sign > 0 ? "bg-success" : "bg-destructive"}`}
                          style={{ width: `${b.v * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Button asChild variant="gold" size="lg">
            <Link to="/score">Generate Your Own Score <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
