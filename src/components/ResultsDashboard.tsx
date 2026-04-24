import { motion } from "framer-motion";
import { Banknote, CheckCircle2, Download, Lightbulb, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "./ScoreGauge";
import { ShapChart } from "./ShapChart";
import { TIER_META } from "@/lib/scoring";
import type { CreditResult, UserProfile } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  result: CreditResult;
  profileName?: string;
  pin?: string;
}

export function ResultsDashboard({ result, profileName, pin }: Props) {
  const tier = TIER_META[result.tier];

  const downloadReport = () => {
    const content = `CREDIT VISTA — SCORE REPORT
Generated: ${new Date(result.generatedAt).toLocaleString("en-IN")}
${profileName ? `Customer: ${profileName}` : ""}

SCORE: ${result.score} / 900
TIER:  ${result.tier}

EXPLANATION (SHAP-style impact, in score points):
${Object.entries(result.shap)
  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  .map(([k, v]) => `  ${v >= 0 ? "+" : ""}${v.toFixed(1)}\t${k}`)
  .join("\n")}

TOP POSITIVE: ${result.topPositive.feature} (+${result.topPositive.value.toFixed(1)} pts)
TOP NEGATIVE: ${result.topNegative.feature} (${result.topNegative.value.toFixed(1)} pts)

RECOMMENDED ACTIONS:
${result.recommendations.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

LIKELY LOAN OPTIONS:
${result.loanOptions.map((l) => `  - ${l}`).join("\n")}

Disclaimer: Credit Vista is a demonstration prototype for InnovFest 2026.
Scores are generated from behavioural signals and do not constitute an
official credit assessment.
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-vista-report-${result.score}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <div className="space-y-8">
      {/* ROW 1 — Score hero */}
      <div className="glass-card p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center">
        <div className="flex justify-center">
          <ScoreGauge score={result.score} size={340} />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3" /> AI-generated explanation
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-5xl">{tier.emoji}</span>
            <div>
              <div className={`font-display text-3xl font-bold ${tier.colorClass}`}>{result.tier}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Tier</div>
            </div>
          </div>
          <p className="mt-4 text-foreground/90 leading-relaxed">{tier.description}</p>
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">{tier.loanLine}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 — SHAP */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Why did you get this score?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              SHAP-style breakdown — each bar shows how much that signal pushed your score up (green) or down (red).
            </p>
          </div>
        </div>
        <ShapChart shap={result.shap} />

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl border border-success/40 bg-success/10 p-5"
          >
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Top Positive</span>
            </div>
            <p className="mt-2 font-semibold">{result.topPositive.feature}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contributed <span className="text-success font-semibold">+{result.topPositive.value.toFixed(1)}</span> points — your strongest signal in this profile.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-5"
          >
            <div className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Top Negative</span>
            </div>
            <p className="mt-2 font-semibold">{result.topNegative.feature}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Reduced your score by <span className="text-destructive font-semibold">{Math.abs(result.topNegative.value).toFixed(1)}</span> points — your biggest improvement opportunity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl border border-accent/40 bg-accent/10 p-5"
          >
            <div className="flex items-center gap-2 text-accent">
              <Lightbulb className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">#1 Actionable Tip</span>
            </div>
            <p className="text-sm mt-2 leading-relaxed">{result.recommendations[0]}</p>
          </motion.div>
        </div>
      </div>

      {/* ROW 3 — Recommendations */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">What can you do next?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-success/30 bg-success/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-5 w-5 text-success" />
              <h3 className="font-semibold">Loans you likely qualify for</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {result.loanOptions.map((l) => (
                <li key={l} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Improve your score</h3>
            </div>
            <ol className="space-y-3 text-sm list-decimal list-inside marker:text-primary marker:font-semibold">
              {result.recommendations.map((r, i) => (
                <li key={i} className="leading-relaxed">{r}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Share your score</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download a portable report or come back later using your 4-digit PIN.
            </p>
            <Button variant="gold" onClick={downloadReport} className="w-full">
              <Download className="h-4 w-4" /> Download Report
            </Button>
            {pin && (
              <div className="mt-3 text-xs text-center text-muted-foreground">
                ✅ Saved with PIN <span className="font-mono text-foreground">••••</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
