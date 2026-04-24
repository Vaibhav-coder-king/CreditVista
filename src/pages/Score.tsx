import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepProgress } from "@/components/StepProgress";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { EditableSignalsPanel } from "@/components/EditableSignalsPanel";
import { useVista } from "@/state/VistaContext";
import { parseStatement, ParseProgress } from "@/lib/pdfParser";
import { generateCreditResult } from "@/lib/scoring";
import { saveResultByPin } from "@/lib/storage";
import { DEFAULT_FEATURES, EmploymentType, FEATURE_LABELS, FeatureSet } from "@/lib/types";
import { ArrowLeft, ArrowRight, FileUp, IndianRupee, Loader2, Sparkles, Wand2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Basic Info", "Upload Statement", "Your Score"];

export default function Score() {
  const navigate = useNavigate();
  const { state, dispatch } = useVista();
  const [step, setStep] = useState(0);

  // Form fields
  const [name, setName] = useState(state.profile.name ?? "");
  const [phone, setPhone] = useState(state.profile.phone ?? "");
  const [employment, setEmployment] = useState<EmploymentType>(state.profile.employment ?? "salaried");
  const [income, setIncome] = useState<number>(state.profile.income ?? 25000);
  const [pin, setPin] = useState<string>(state.profile.pin ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2 state
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [parsedFeatures, setParsedFeatures] = useState<FeatureSet | null>(null);
  const [parseConfidence, setParseConfidence] = useState<"low" | "medium" | "high" | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualFeatures, setManualFeatures] = useState<FeatureSet>(DEFAULT_FEATURES);
  const [generating, setGenerating] = useState(false);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Please enter your name";
    if (!/^[+0-9 ]{10,15}$/.test(phone.trim())) e.phone = "Enter a valid phone number";
    if (income < 5000 || income > 500000) e.income = "Income must be between ₹5,000 and ₹5,00,000";
    if (!/^\d{4}$/.test(pin)) e.pin = "PIN must be 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNextFromStep1 = () => {
    if (!validateStep1()) return;
    dispatch({ type: "SET_PROFILE", payload: { name, phone, employment, income, pin } });
    setStep(1);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setParsedFeatures(null);
    setParseConfidence(null);
    setUsedFallback(false);
    try {
      const res = await parseStatement(file, income, (p) => setProgress(p));
      setParsedFeatures(res.features);
      setParseConfidence(res.confidence);
      setUsedFallback(res.usedDeclaredIncomeFallback);
      dispatch({ type: "SET_FEATURES", payload: res.features, parsed: true });

      const lowSignals = res.features.upi_frequency + res.features.bill_payment_score < 2;
      if (lowSignals || res.confidence === "low") {
        toast.warning("Low-confidence parse — verify the values below");
      } else if (res.statementType === "paytm" && res.summary) {
        toast.success(
          `✅ Paytm Statement parsed — ${res.summary.paymentsMade} payments made, ${res.summary.paymentsReceived} received over 12 months`,
        );
      } else if (res.statementType === "gpay" && res.summary) {
        const sent = `₹${Math.round(res.summary.totalPaid).toLocaleString("en-IN")}`;
        const received = `₹${Math.round(res.summary.totalReceived).toLocaleString("en-IN")}`;
        toast.success(
          `✅ Google Pay Statement parsed — ${sent} sent, ${received} received over ${res.summary.monthsCovered ?? 6} months`,
        );
      } else if (res.statementType === "bank") {
        toast.success(
          `✅ Bank Statement parsed — ${res.detected.creditAmounts.length} credit transactions found`,
        );
      } else {
        toast.warning("⚠️ Statement format auto-detected — please verify the extracted values below");
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't parse that file. Try manual entry below.");
      setManualMode(true);
    } finally {
      setParsing(false);
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const generate = async () => {
    setGenerating(true);
    const features = manualMode ? manualFeatures : (parsedFeatures ?? DEFAULT_FEATURES);
    dispatch({ type: "SET_FEATURES", payload: features, parsed: !manualMode });
    const result = generateCreditResult(features, employment, income);
    dispatch({ type: "SET_RESULT", payload: result });

    try {
      await saveResultByPin(pin, {
        profile: { name, employment, income },
        features,
        result,
      });
      toast.success("Score saved with PIN ✅");
    } catch {
      toast.error("Couldn't save locally");
    }

    setStep(2);
    setGenerating(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const lowConfidence =
    parsedFeatures !== null &&
    (parseConfidence === "low" || parsedFeatures.upi_frequency + parsedFeatures.bill_payment_score < 2);

  return (
    <div className="container py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Get your Credit Vista score</h1>
          <p className="mt-3 text-muted-foreground">
            Three short steps. No CIBIL pull. Your data stays in your browser.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8 mb-8">
          <StepProgress steps={STEPS} current={step} />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-card p-6 md:p-8 grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={employment} onValueChange={(v) => setEmployment(v as EmploymentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="gig">Gig Worker</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="income">Declared Monthly Income (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="income"
                      type="number"
                      min={5000}
                      max={500000}
                      value={income}
                      onChange={(e) => setIncome(Number(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  {errors.income && <p className="text-xs text-destructive mt-1">{errors.income}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="pin">Create a 4-digit PIN <span className="text-muted-foreground">(to retrieve your score later)</span></Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="tracking-[0.6em] text-center text-lg font-mono max-w-[200px]"
                  />
                  {errors.pin && <p className="text-xs text-destructive mt-1">{errors.pin}</p>}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="gold" size="lg" onClick={goNextFromStep1}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="glass-card p-10 border-dashed border-2 border-primary/30 hover:border-primary/60 transition text-center"
              >
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center text-primary mb-4">
                  <FileUp className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold">Drop your bank statement here</h3>
                <p className="text-sm text-muted-foreground mt-1">PDF, PNG or JPG · processed locally in your browser</p>
                <div className="mt-5">
                  <input
                    id="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <Button asChild variant="hero">
                    <label htmlFor="file" className="cursor-pointer">Choose file</label>
                  </Button>
                </div>
                <div className="mt-5 max-w-md mx-auto text-xs text-muted-foreground p-3 rounded-md bg-secondary/40 border border-border">
                  🔒 Your statement is processed locally. We extract only behavioural patterns — no raw data is stored.
                </div>
              </div>

              {parsing && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">{progress?.step ?? "Working..."}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      animate={{ width: `${progress?.pct ?? 10}%` }}
                      className="h-full bg-primary"
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {lowConfidence && !parsing && (
                <div className="glass-card p-4 border border-warning/40 bg-warning/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">Low confidence parse</p>
                      <p className="text-muted-foreground mt-1">
                        Your PDF may be scanned/image-based. Please verify the values below or use manual entry.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parsedFeatures && !parsing && !manualMode && (
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      <h3 className="font-display text-lg font-semibold">Extracted Signals</h3>
                      <span className="text-xs text-muted-foreground">(click any value to edit)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setManualMode(true); setManualFeatures(parsedFeatures); }}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Wand2 className="h-3 w-3" />
                      Use sliders instead →
                    </button>
                  </div>

                  <EditableSignalsPanel
                    features={parsedFeatures}
                    onChange={(f) => {
                      setParsedFeatures(f);
                      dispatch({ type: "SET_FEATURES", payload: f, parsed: true });
                    }}
                  />

                  <div className="mt-5 text-xs text-muted-foreground border-t border-border pt-4 flex flex-wrap gap-x-6 gap-y-1">
                    <span>Self-declared income: <span className="text-foreground font-mono">₹{income.toLocaleString("en-IN")}</span></span>
                    {usedFallback && (
                      <span className="text-warning">⚠ No salary credits found — using declared income for monthly credit</span>
                    )}
                  </div>
                </div>
              )}

              {!parsedFeatures && !parsing && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setManualMode(true); setManualFeatures(DEFAULT_FEATURES); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Don't have your PDF? Enter manually →
                  </button>
                </div>
              )}

              {manualMode && (
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Manual signal entry</h3>
                    {parsedFeatures && (
                      <button
                        type="button"
                        onClick={() => setManualMode(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        ← Back to parsed values
                      </button>
                    )}
                  </div>
                  <ManualSliders features={manualFeatures} onChange={setManualFeatures} />
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  variant="gold"
                  size="lg"
                  disabled={(!parsedFeatures && !manualMode) || generating}
                  onClick={generate}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate My Score
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && state.result && (
            <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <ResultsDashboard result={state.result} profileName={name} pin={pin} />
              <div className="mt-8 flex justify-center gap-3">
                <Button variant="outline-blue" onClick={() => navigate("/dashboard")}>
                  Open full dashboard <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => { setStep(0); dispatch({ type: "SET_RESULT", payload: null }); }}>
                  Generate another
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ManualSliders({ features, onChange }: { features: FeatureSet; onChange: (f: FeatureSet) => void }) {
  const update = <K extends keyof FeatureSet>(k: K, v: number) => onChange({ ...features, [k]: v });

  const rows: Array<{ key: keyof FeatureSet; min: number; max: number; step: number; format: (v: number) => string }> = [
    { key: "monthly_credit_avg", min: 5000, max: 200000, step: 1000, format: (v) => `₹${v.toLocaleString("en-IN")}` },
    { key: "income_regularity", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
    { key: "savings_ratio", min: 0, max: 0.5, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
    { key: "bill_payment_score", min: 0, max: 12, step: 1, format: (v) => `${v}/12` },
    { key: "upi_frequency", min: 0, max: 250, step: 5, format: (v) => `${v}` },
    { key: "emi_burden_ratio", min: 0, max: 0.6, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
    { key: "cash_dependency", min: 0, max: 0.8, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
    { key: "spending_discipline", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
    { key: "payment_streak", min: 0, max: 12, step: 1, format: (v) => `${v} mo` },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
      {rows.map((r) => (
        <div key={r.key as string}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{FEATURE_LABELS[r.key]}</span>
            <span className="font-mono text-foreground">{r.format(features[r.key])}</span>
          </div>
          <Slider
            min={r.min}
            max={r.max}
            step={r.step}
            value={[features[r.key]]}
            onValueChange={(v) => update(r.key, v[0])}
          />
        </div>
      ))}
    </div>
  );
}
