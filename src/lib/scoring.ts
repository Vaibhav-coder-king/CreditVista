import {
  CreditResult,
  EmploymentType,
  EMPLOYMENT_CODE,
  FeatureSet,
  ScoreTier,
  ShapMap,
} from "./types";

/**
 * computeCreditScore — TS port of the prototype XGBoost-like rule model.
 * Returns a normalized 300..900 score.
 */
export function computeCreditScore(
  features: FeatureSet,
  employment: EmploymentType,
  income: number,
): number {
  const empCode = EMPLOYMENT_CODE[employment];
  const raw =
    features.income_regularity * 30 +
    features.savings_ratio * 20 +
    (features.bill_payment_score / 12) * 20 +
    features.spending_discipline * 15 +
    (features.payment_streak / 12) * 15 -
    features.emi_burden_ratio * 25 -
    features.cash_dependency * 15 +
    (empCode === 0 ? 5 : empCode === 1 ? 2 : -2) +
    (income > 30000 ? 3 : 0);

  // Map raw (~ -40..100) into [0,1] then scale to 300..900
  const normalized = Math.max(0, Math.min(1, (raw + 10) / 100));
  return Math.round(300 + normalized * 600);
}

export function tierFromScore(score: number): ScoreTier {
  if (score >= 750) return "EXCELLENT";
  if (score >= 650) return "GOOD";
  if (score >= 550) return "FAIR";
  if (score >= 450) return "POOR";
  return "VERY POOR";
}

export interface TierMeta {
  emoji: string;
  description: string;
  loanLine: string;
  colorClass: string;
}

export const TIER_META: Record<ScoreTier, TierMeta> = {
  EXCELLENT: {
    emoji: "🏆",
    description:
      "Outstanding financial behaviour. Lenders see you as a top-tier, low-risk borrower.",
    loanLine: "Eligible for premium personal loans, low-interest credit cards & business credit.",
    colorClass: "text-score-excellent",
  },
  GOOD: {
    emoji: "✅",
    description:
      "Strong, healthy money habits. Most mainstream lenders will be happy to work with you.",
    loanLine: "Eligible for personal loans up to ₹3L, secured credit cards & MSME credit.",
    colorClass: "text-score-good",
  },
  FAIR: {
    emoji: "⚖️",
    description:
      "Decent foundation with room to improve. NBFCs and digital lenders are likely to approve smaller amounts.",
    loanLine: "Eligible for small personal loans (₹50K–1L), MUDRA loans & SHG credit linkage.",
    colorClass: "text-score-fair",
  },
  POOR: {
    emoji: "⚠️",
    description:
      "Some risk signals detected. Focus on building consistent payment habits over the next 3–6 months.",
    loanLine: "Limited to micro-loans, secured options & SHG-backed credit.",
    colorClass: "text-score-poor",
  },
  "VERY POOR": {
    emoji: "🚧",
    description:
      "High-risk profile right now. Build a 3–6 month track record of regular UPI bill payments before re-applying.",
    loanLine: "Recommend starting with a Jan Dhan account, micro-savings & PMJDY-linked products.",
    colorClass: "text-score-very-poor",
  },
};

/**
 * Mock SHAP-like contributions (in score points). Sum is a directional explanation,
 * not exact contribution to the final 300–900 number — same shape as the brief.
 */
export function computeSHAPExplanation(features: FeatureSet): ShapMap {
  return {
    "Income Consistency": +((features.income_regularity - 0.5) * 60).toFixed(1),
    "Bills Paid On Time": +((features.bill_payment_score / 12 - 0.5) * 40).toFixed(1),
    "Digital Payment Usage": +((features.upi_frequency / 150 - 0.3) * 35).toFixed(1),
    "Savings Habit": +((features.savings_ratio - 0.15) * 40).toFixed(1),
    "EMI/Loan Burden": +(-(features.emi_burden_ratio) * 50).toFixed(1),
    "Cash Withdrawal Habit": +(-(features.cash_dependency - 0.2) * 30).toFixed(1),
    "Spending Discipline": +((features.spending_discipline - 0.5) * 30).toFixed(1),
    "Consecutive Payment Streak": +((features.payment_streak / 12 - 0.4) * 25).toFixed(1),
  };
}

const FACTOR_TIPS: Record<string, string> = {
  "Income Consistency":
    "Set up at least one regular monthly credit (salary, retainer, or scheduled UPI from clients) to lift this signal.",
  "Bills Paid On Time":
    "Automate electricity, mobile and DTH bills via UPI AutoPay — even 2–3 on-time months move this score noticeably.",
  "Digital Payment Usage":
    "Shift everyday spending (groceries, fuel, recharges) to UPI — 80+ UPI txns/month is the sweet spot.",
  "Savings Habit":
    "Park even ₹500/week into a recurring deposit or savings account — consistency matters more than amount.",
  "EMI/Loan Burden":
    "Pre-pay or consolidate one existing loan. Bringing EMI below 20% of income gives the biggest single boost.",
  "Cash Withdrawal Habit":
    "Switching ₹3,000/month of cash withdrawals to UPI payments could improve your score by ~15 points within 3 months.",
  "Spending Discipline":
    "Cap discretionary categories (food delivery, entertainment) at 25% of monthly credit using a budgeting app.",
  "Consecutive Payment Streak":
    "Don't break the streak — even one missed mobile recharge resets months of progress. Use AutoPay.",
};

export function buildRecommendations(shap: ShapMap, tier: ScoreTier): { tips: string[]; loans: string[] } {
  // Worst (most negative) factors first
  const worst = Object.entries(shap)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([f]) => FACTOR_TIPS[f] ?? `Improve ${f}.`);

  const loanByTier: Record<ScoreTier, string[]> = {
    EXCELLENT: [
      "Premium Personal Loan up to ₹5L (10–12% p.a.)",
      "Unsecured Business Credit Line up to ₹10L",
      "Top-tier rewards Credit Card",
    ],
    GOOD: [
      "Personal Loan ₹50K–₹3L (13–16% p.a.)",
      "MUDRA Loan (Tarun) up to ₹10L for business",
      "Secured Credit Card with ₹50K limit",
    ],
    FAIR: [
      "Personal Loan ₹50K–₹1L (digital NBFC)",
      "MUDRA Loan (Kishor) ₹50K–₹5L",
      "SHG Credit Linkage up to ₹3L",
    ],
    POOR: [
      "Micro-loan ₹10K–₹50K via NBFC",
      "Secured loan against gold or FD",
      "SHG-backed group credit",
    ],
    "VERY POOR": [
      "Open a PMJDY (Jan Dhan) account first",
      "Start with ₹500/month RD to build history",
      "Apply for SHG credit linkage after 3 months",
    ],
  };

  return { tips: worst, loans: loanByTier[tier] };
}

export function generateCreditResult(
  features: FeatureSet,
  employment: EmploymentType,
  income: number,
): CreditResult {
  const score = computeCreditScore(features, employment, income);
  const tier = tierFromScore(score);
  const shap = computeSHAPExplanation(features);

  const sorted = Object.entries(shap).sort((a, b) => b[1] - a[1]);
  const topPositive = { feature: sorted[0][0], value: sorted[0][1] };
  const topNegative = {
    feature: sorted[sorted.length - 1][0],
    value: sorted[sorted.length - 1][1],
  };

  const { tips, loans } = buildRecommendations(shap, tier);

  return {
    score,
    tier,
    shap,
    topPositive,
    topNegative,
    recommendations: tips,
    loanOptions: loans,
    generatedAt: new Date().toISOString(),
  };
}
