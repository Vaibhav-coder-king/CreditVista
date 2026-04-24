// Credit Vista — Core domain types

export type EmploymentType = "salaried" | "self-employed" | "gig" | "freelancer";

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  salaried: "Salaried",
  "self-employed": "Self-Employed",
  gig: "Gig Worker",
  freelancer: "Freelancer",
};

// Numeric encoding used inside the scoring function (mirrors a sklearn LabelEncoder)
export const EMPLOYMENT_CODE: Record<EmploymentType, number> = {
  salaried: 0,
  "self-employed": 1,
  freelancer: 2,
  gig: 3,
};

export interface UserProfile {
  name: string;
  phone: string;
  employment: EmploymentType;
  income: number; // declared monthly income ₹
  pin: string;    // 4-digit
}

export interface FeatureSet {
  monthly_credit_avg: number;   // ₹
  income_regularity: number;    // 0..1
  savings_ratio: number;        // 0..1
  bill_payment_score: number;   // 0..12 (months on time)
  upi_frequency: number;        // count / month
  emi_burden_ratio: number;     // 0..1
  cash_dependency: number;      // 0..1
  spending_discipline: number;  // 0..1
  payment_streak: number;       // 0..12 months
}

export type ShapMap = Record<string, number>;

export type ScoreTier = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "VERY POOR";

export interface CreditResult {
  score: number;            // 300..900
  tier: ScoreTier;
  shap: ShapMap;
  topPositive: { feature: string; value: number };
  topNegative: { feature: string; value: number };
  recommendations: string[];
  loanOptions: string[];
  generatedAt: string;
}

export const FEATURE_LABELS: Record<keyof FeatureSet, string> = {
  monthly_credit_avg: "Avg Monthly Credit",
  income_regularity: "Income Regularity",
  savings_ratio: "Savings Ratio",
  bill_payment_score: "Bills Paid On Time",
  upi_frequency: "UPI Transactions/month",
  emi_burden_ratio: "EMI Burden",
  cash_dependency: "Cash Dependency",
  spending_discipline: "Spending Discipline",
  payment_streak: "Payment Streak",
};

export const DEFAULT_FEATURES: FeatureSet = {
  monthly_credit_avg: 25000,
  income_regularity: 0.65,
  savings_ratio: 0.18,
  bill_payment_score: 9,
  upi_frequency: 80,
  emi_burden_ratio: 0.18,
  cash_dependency: 0.22,
  spending_discipline: 0.6,
  payment_streak: 6,
};
