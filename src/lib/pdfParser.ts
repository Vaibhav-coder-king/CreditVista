import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DEFAULT_FEATURES, FeatureSet } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ParseProgress {
  step: string;
  pct: number;
}

export type StatementType = "paytm" | "gpay" | "bank" | "unknown";

export interface ParseResult {
  features: FeatureSet;
  rawTextSample: string;
  confidence: "low" | "medium" | "high";
  statementType: StatementType;
  summary?: {
    totalReceived: number;
    totalPaid: number;
    paymentsMade: number;
    paymentsReceived: number;
    monthsCovered?: number;
    totalTransactionCount?: number;
  };
  detected: {
    upiCount: number;
    billCount: number;
    emiCount: number;
    cashCount: number;
    creditAmounts: number[];
    debitAmounts: number[];
  };
  usedDeclaredIncomeFallback: boolean;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

function mean(arr: number[]) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.map((x) => (x - m) ** 2).reduce((a, b) => a + b, 0) / arr.length);
}

interface ExtractionDetails {
  features: FeatureSet;
  detected: ParseResult["detected"];
  usedDeclaredIncomeFallback: boolean;
  summary?: ParseResult["summary"];
}

// ---------- Statement type detection ----------
function detectStatementType(text: string): StatementType {
  // Google Pay — check BEFORE Paytm since both mention UPI
  if (
    text.includes("Transaction statement") &&
    (text.includes("Google Pay") || text.includes("UPI Transaction ID")) &&
    text.includes("Sent") &&
    text.includes("Received") &&
    !text.includes("Paytm Statement") &&
    !text.includes("Total Money Paid")
  ) {
    return "gpay";
  }

  const lower = text.toLowerCase();
  if (
    lower.includes("paytm statement") ||
    lower.includes("total money paid") ||
    lower.includes("total money received") ||
    lower.includes("payments made") ||
    lower.includes("payments received") ||
    /paid to|received from/i.test(text)
  ) {
    return "paytm";
  }
  const upper = text.toUpperCase();
  if (
    (upper.includes("CR") && upper.includes("DR")) ||
    upper.includes("OPENING BALANCE") ||
    upper.includes("CLOSING BALANCE") ||
    (upper.includes("BALANCE") && (upper.includes(" CR") || upper.includes(" DR")))
  ) {
    return "bank";
  }
  return "unknown";
}

// ---------- Google Pay Statement Parser ----------
const GPAY_MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseGPayStatement(text: string, declaredIncome: number): ExtractionDetails {
  // A. Header summary
  const sentMatch = text.match(/Sent\s*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i);
  const receivedMatch = text.match(/Received\s*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i);
  const totalSent = sentMatch ? parseFloat(sentMatch[1].replace(/,/g, "")) : 0;
  const totalReceived = receivedMatch ? parseFloat(receivedMatch[1].replace(/,/g, "")) : 0;

  // B. Statement period -> months covered
  const periodMatch = text.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );
  let monthsCovered = 6;
  if (periodMatch) {
    const sM = GPAY_MONTH_MAP[periodMatch[2].toLowerCase()];
    const sY = parseInt(periodMatch[3]);
    const eM = GPAY_MONTH_MAP[periodMatch[5].toLowerCase()];
    const eY = parseInt(periodMatch[6]);
    monthsCovered = Math.max(1, (eY - sY) * 12 + (eM - sM) + 1);
  }

  // C. Total transaction count via date pattern
  const datePattern = /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+\d{4}/gi;
  const totalTransactionCount = (text.match(datePattern) || []).length;

  // D. Walk lines to bucket credit vs debit amounts using preceding context
  const lines = text.split(/\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
  const creditAmounts: number[] = [];
  const debitAmounts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const amountMatch = lines[i].match(/^[₹Rs.]+\s*([\d,]+(?:\.\d{1,2})?)$/);
    if (!amountMatch) continue;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < 1) continue;
    const context = lines.slice(Math.max(0, i - 5), i).join(" ").toLowerCase();
    if (context.includes("received from")) creditAmounts.push(amount);
    else if (context.includes("paid to")) debitAmounts.push(amount);
  }

  // Fallback when text has no real newlines: split tokens — extract all ₹ amounts and bucket via nearest keyword
  if (creditAmounts.length === 0 && debitAmounts.length === 0) {
    const amtRegex = /₹\s*([\d,]+(?:\.\d{1,2})?)/g;
    let m: RegExpExecArray | null;
    while ((m = amtRegex.exec(text)) !== null) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount < 1) continue;
      const before = text.slice(Math.max(0, m.index - 200), m.index).toLowerCase();
      const lastReceived = before.lastIndexOf("received from");
      const lastPaid = before.lastIndexOf("paid to");
      if (lastReceived > lastPaid && lastReceived !== -1) creditAmounts.push(amount);
      else if (lastPaid !== -1) debitAmounts.push(amount);
    }
  }

  // E. Bill payments
  const billKeywords = [
    "PSPCL", "BESCOM", "MSEDCL", "BSES", "TATA POWER", "electricity",
    "BSNL", "JIO", "AIRTEL", "VODAFONE", "VI PREPAID", "water board",
    "FASTag", "Bajaj Pay FASTag", "municipal", "gas supply",
  ];
  let billPaymentCount = 0;
  for (const kw of billKeywords) {
    const matches = text.match(new RegExp(kw, "gi")) || [];
    billPaymentCount += matches.length;
  }
  const bill_payment_score = Math.min(billPaymentCount, 12);

  // F. UPI freq / month
  const upi_frequency = Math.min(Math.round(totalTransactionCount / monthsCovered), 150);

  // G. Monthly credit avg
  const regularCredits = creditAmounts.filter((a) => a < 50000);
  const monthly_credit_avg =
    regularCredits.length > 0
      ? Math.round(regularCredits.reduce((a, b) => a + b, 0) / monthsCovered)
      : totalReceived > 0
      ? Math.round(totalReceived / monthsCovered)
      : declaredIncome;

  // H. Income regularity
  const income_regularity =
    regularCredits.length >= 3
      ? parseFloat(
          Math.max(0, Math.min(1 - stdDev(regularCredits) / (mean(regularCredits) + 1) / 2, 1)).toFixed(2),
        )
      : 0.4;

  // I. Savings ratio
  const rawSavings =
    totalReceived + totalSent > 0
      ? (totalReceived - totalSent) / (totalReceived + totalSent + 1)
      : 0.05;
  const savings_ratio = parseFloat(Math.max(0, Math.min(rawSavings, 1)).toFixed(2));

  // J. EMI burden
  const emiCount = (text.match(/\bEMI\b|LOAN REPAY|NACH|ECS/gi) || []).length;
  const emi_burden_ratio = parseFloat(Math.min(emiCount * 0.04, 0.6).toFixed(2));

  // K. Cash dependency — all digital
  const cash_dependency = 0.03;

  // L. Spending discipline — proportion of small debits
  const smallDebits = debitAmounts.filter((a) => a < 500).length;
  const spending_discipline =
    debitAmounts.length > 0
      ? parseFloat(Math.min(smallDebits / (debitAmounts.length + 1) + 0.3, 1).toFixed(2))
      : 0.6;

  const payment_streak = Math.min(bill_payment_score, 12);

  const features: FeatureSet = {
    monthly_credit_avg,
    income_regularity,
    savings_ratio,
    bill_payment_score,
    upi_frequency,
    emi_burden_ratio,
    cash_dependency,
    spending_discipline,
    payment_streak,
  };

  const usedDeclaredIncomeFallback = regularCredits.length === 0 && totalReceived === 0;

  return {
    features,
    detected: {
      upiCount: totalTransactionCount,
      billCount: billPaymentCount,
      emiCount,
      cashCount: 0,
      creditAmounts,
      debitAmounts,
    },
    usedDeclaredIncomeFallback,
    summary: {
      totalReceived,
      totalPaid: totalSent,
      paymentsMade: debitAmounts.length,
      paymentsReceived: creditAmounts.length,
      monthsCovered,
      totalTransactionCount,
    },
  };
}

// ---------- Paytm UPI Statement Parser ----------
function parsePaytmStatement(text: string, declaredIncome: number): ExtractionDetails {
  // Header summary
  const totalReceivedMatch = text.match(/Total Money Received\s*\+?\s*Rs\.?\s*([\d,]+)/i);
  const totalPaidMatch = text.match(/Total Money Paid\s*-?\s*Rs\.?\s*([\d,]+)/i);
  const paymentsReceivedMatch = text.match(/(\d+)\s*Payments?\s*received/i);
  const paymentsMadeMatch = text.match(/(\d+)\s*Payments?\s*made/i);

  const totalReceived = totalReceivedMatch ? parseFloat(totalReceivedMatch[1].replace(/,/g, "")) : 0;
  const totalPaid = totalPaidMatch ? parseFloat(totalPaidMatch[1].replace(/,/g, "")) : 0;
  const paymentsReceived = paymentsReceivedMatch ? parseInt(paymentsReceivedMatch[1]) : 0;
  const paymentsMade = paymentsMadeMatch ? parseInt(paymentsMadeMatch[1]) : 0;

  // Individual transaction amounts
  const creditAmounts = [...text.matchAll(/\+\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 10);

  const debitAmounts = [...text.matchAll(/-\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 10);

  // Bills + recharges
  const billPaymentCount = (text.match(/#\s*Bill Payments/gi) || []).length;
  const rechargeCount = (text.match(/Recharge of|JIO|AIRTEL|BSNL|VODAFONE|VI\b/gi) || []).length;
  const totalBillPayments = Math.min(billPaymentCount + Math.floor(rechargeCount / 2), 12);

  // Statement assumed to cover up to 12 months
  const monthsCovered = 12;
  const upi_frequency = Math.min(Math.round((paymentsMade || debitAmounts.length) / monthsCovered), 150);

  // Monthly credit average — strip out one-time large transfers that aren't income
  const regularCreditAmounts = creditAmounts.filter((a) => a < 50000);
  const monthly_credit_avg =
    regularCreditAmounts.length > 0
      ? Math.round(regularCreditAmounts.reduce((a, b) => a + b, 0) / monthsCovered)
      : totalReceived > 0
      ? Math.round(totalReceived / monthsCovered)
      : declaredIncome;

  const income_regularity =
    regularCreditAmounts.length >= 3
      ? parseFloat(
          Math.max(
            0,
            Math.min(1 - stdDev(regularCreditAmounts) / (mean(regularCreditAmounts) + 1) / 3, 1),
          ).toFixed(2),
        )
      : 0.5;

  const savings_ratio =
    totalReceived > 0
      ? parseFloat(Math.max(0, Math.min((totalReceived - totalPaid) / totalReceived, 1)).toFixed(2))
      : 0.1;

  // Spending discipline from tag mix
  const groceryCount = (text.match(/#\s*Groceries/gi) || []).length;
  const foodCount = (text.match(/#\s*Food/gi) || []).length;
  const shoppingCount = (text.match(/#\s*Shopping/gi) || []).length;
  const entertainmentCount = (text.match(/#\s*Entertainment/gi) || []).length;
  const essentialSpend = groceryCount + foodCount;
  const totalTaggedSpend = essentialSpend + shoppingCount + entertainmentCount;
  const spending_discipline =
    totalTaggedSpend > 0
      ? parseFloat(Math.min(essentialSpend / totalTaggedSpend + 0.2, 1).toFixed(2))
      : 0.6;

  // Paytm = digital only
  const cash_dependency = 0.05;

  const emiCount = (text.match(/EMI|LOAN|NACH|ECS/gi) || []).length;
  const emi_burden_ratio = parseFloat(Math.min(emiCount * 0.03, 0.5).toFixed(2));

  const payment_streak = Math.min(totalBillPayments, 12);

  const features: FeatureSet = {
    monthly_credit_avg,
    income_regularity,
    savings_ratio,
    bill_payment_score: totalBillPayments,
    upi_frequency,
    emi_burden_ratio,
    cash_dependency,
    spending_discipline,
    payment_streak,
  };

  const usedDeclaredIncomeFallback = regularCreditAmounts.length === 0 && totalReceived === 0;

  return {
    features,
    detected: {
      upiCount: paymentsMade || debitAmounts.length,
      billCount: billPaymentCount,
      emiCount,
      cashCount: 0,
      creditAmounts,
      debitAmounts,
    },
    usedDeclaredIncomeFallback,
    summary: { totalReceived, totalPaid, paymentsMade, paymentsReceived },
  };
}

// ---------- Generic Bank Statement Parser ----------
function parseBankStatement(text: string, declaredIncome: number): ExtractionDetails {
  const upper = text.toUpperCase();

  const upiMatches = (upper.match(/UPI|PHONEPE|GPAY|GOOGLE PAY|PAYTM|BHIM/g) || []).length;
  const upi_frequency = Math.min(upiMatches, 150);

  const billMatches = (upper.match(
    /ELECTRICITY|BESCOM|MSEDCL|BSES|TATA POWER|BSNL|AIRTEL|JIO|VODAFONE|VI\b|WATER|MUNICIPAL|GAS|INDANE|HP GAS|MAHANAGAR|TORRENT|ADANI ELEC/g,
  ) || []).length;
  const bill_payment_score = Math.min(billMatches, 12);

  const emiMatches = (upper.match(/\bEMI\b|NACH|ECS|LOAN REPAY|EQUATED/g) || []).length;
  const emi_burden_ratio = Math.min(emiMatches * 0.05, 0.8);

  const atmMatches = (upper.match(/ATM|CASH WDL|CASH WITHDRAWAL|ATW/g) || []).length;
  const totalDebitMatches = (upper.match(/DR\b|DEBIT|WITHDRAWAL|PAID|PURCHASE/g) || []).length;
  const cash_dependency = totalDebitMatches > 0 ? Math.min(atmMatches / totalDebitMatches, 1) : 0.2;

  const creditPattern = /(?:SALARY|SAL|NEFT CR|CR|CREDIT|PAYROLL|CREDITED)[\s\S]{0,30}?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const creditMatches = [...upper.matchAll(creditPattern)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => n >= 1000 && n <= 500000);

  const usedDeclaredIncomeFallback = creditMatches.length === 0;
  const monthly_credit_avg =
    creditMatches.length > 0
      ? creditMatches.reduce((a, b) => a + b, 0) / creditMatches.length
      : declaredIncome;

  const income_regularity =
    creditMatches.length > 2
      ? Math.max(0, 1 - stdDev(creditMatches) / (mean(creditMatches) + 1) / 2)
      : 0.5;

  const debitPattern = /(?:DR\b|DEBIT|WITHDRAWAL|PURCHASE)[\s\S]{0,30}?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const debitMatches = [...upper.matchAll(debitPattern)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => n >= 100 && n <= 300000);

  const totalCredits = creditMatches.reduce((a, b) => a + b, 0) || declaredIncome * 3;
  const totalDebits = debitMatches.reduce((a, b) => a + b, 0) || declaredIncome * 2.5;

  const savings_ratio = Math.max(0, Math.min((totalCredits - totalDebits) / (totalCredits + 1), 1));
  const spending_discipline =
    debitMatches.length > 3
      ? Math.max(0, 1 - stdDev(debitMatches) / (mean(debitMatches) + 1) / 5)
      : 0.5;

  const payment_streak = Math.min(bill_payment_score, 12);

  const features: FeatureSet = {
    monthly_credit_avg: Math.round(monthly_credit_avg),
    income_regularity: parseFloat(income_regularity.toFixed(2)),
    savings_ratio: parseFloat(savings_ratio.toFixed(2)),
    bill_payment_score,
    upi_frequency,
    emi_burden_ratio: parseFloat(emi_burden_ratio.toFixed(2)),
    cash_dependency: parseFloat(cash_dependency.toFixed(2)),
    spending_discipline: parseFloat(spending_discipline.toFixed(2)),
    payment_streak,
  };

  return {
    features,
    detected: {
      upiCount: upiMatches,
      billCount: billMatches,
      emiCount: emiMatches,
      cashCount: atmMatches,
      creditAmounts: creditMatches,
      debitAmounts: debitMatches,
    },
    usedDeclaredIncomeFallback,
  };
}

const PROGRESS_STEPS: Array<{ step: string; pct: number; delay: number }> = [
  { step: "Reading PDF pages...", pct: 15, delay: 200 },
  { step: "Extracting transactions...", pct: 35, delay: 400 },
  { step: "Detecting bill payments...", pct: 55, delay: 300 },
  { step: "Calculating income patterns...", pct: 78, delay: 300 },
  { step: "Building behavioral profile...", pct: 95, delay: 200 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function parseStatement(
  file: File,
  declaredIncome: number,
  onProgress?: (p: ParseProgress) => void,
): Promise<ParseResult> {
  onProgress?.(PROGRESS_STEPS[0]);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  let text = "";
  if (isPdf) {
    text = await extractTextFromPDF(file);
  }
  await sleep(PROGRESS_STEPS[0].delay);

  for (let i = 1; i < PROGRESS_STEPS.length; i++) {
    onProgress?.(PROGRESS_STEPS[i]);
    await sleep(PROGRESS_STEPS[i].delay);
  }

  let extraction: ExtractionDetails;
  let statementType: StatementType = "unknown";

  if (!text) {
    extraction = {
      features: { ...DEFAULT_FEATURES, monthly_credit_avg: declaredIncome },
      detected: { upiCount: 0, billCount: 0, emiCount: 0, cashCount: 0, creditAmounts: [], debitAmounts: [] },
      usedDeclaredIncomeFallback: true,
    };
  } else {
    statementType = detectStatementType(text);
    if (statementType === "paytm") {
      extraction = parsePaytmStatement(text, declaredIncome);
    } else if (statementType === "gpay") {
      extraction = parseGPayStatement(text, declaredIncome);
    } else if (statementType === "bank") {
      extraction = parseBankStatement(text, declaredIncome);
    } else {
      // Unknown — try GPay first (₹ symbol), then Paytm, fall back to bank
      const gpay = parseGPayStatement(text, declaredIncome);
      const paytm = parsePaytmStatement(text, declaredIncome);
      const gpaySignal = gpay.summary?.totalTransactionCount ?? 0;
      const paytmSignal =
        (paytm.summary?.paymentsMade ?? 0) +
        (paytm.summary?.paymentsReceived ?? 0) +
        paytm.detected.creditAmounts.length;

      if (gpaySignal >= 3 && gpaySignal > paytmSignal) {
        extraction = gpay;
        statementType = "gpay";
      } else if (paytmSignal >= 3) {
        extraction = paytm;
        statementType = "paytm";
      } else {
        extraction = parseBankStatement(text, declaredIncome);
        statementType = "bank";
      }
    }
  }

  // Confidence scoring
  const f = extraction.features;
  let confidence: ParseResult["confidence"] = "low";
  const signalSum = f.upi_frequency + f.bill_payment_score;
  if (statementType === "paytm" && extraction.summary && extraction.summary.paymentsMade > 0) {
    confidence = "high";
  } else if (statementType === "gpay" && (extraction.summary?.totalTransactionCount ?? 0) >= 5) {
    confidence = "high";
  } else if (signalSum >= 2 && signalSum < 10) {
    confidence = "medium";
  } else if (signalSum >= 10 && extraction.detected.creditAmounts.length > 0) {
    confidence = "high";
  }

  onProgress?.({ step: "Done.", pct: 100 });

  return {
    features: f,
    rawTextSample: text.slice(0, 400),
    confidence,
    statementType,
    summary: extraction.summary,
    detected: extraction.detected,
    usedDeclaredIncomeFallback: extraction.usedDeclaredIncomeFallback,
  };
}
