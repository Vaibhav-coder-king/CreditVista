import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Check, X } from "lucide-react";
import { FeatureSet } from "@/lib/types";

interface SignalConfig {
  key: keyof FeatureSet;
  label: string;
  // value stored vs displayed: sometimes displayed as percent
  display: (v: number) => string;
  // editor configuration in the unit the USER types
  editPrefix?: string;
  editSuffix?: string;
  editStep?: number;
  editMin: number;
  editMax: number;
  // convert stored value -> editor input value
  toInput: (v: number) => number;
  // convert editor input value -> stored value (clamped)
  fromInput: (v: number) => number;
}

const SIGNALS: SignalConfig[] = [
  {
    key: "monthly_credit_avg",
    label: "Avg Monthly Credit",
    display: (v) => `₹${Math.round(v).toLocaleString("en-IN")}`,
    editPrefix: "₹",
    editStep: 100,
    editMin: 0,
    editMax: 1_000_000,
    toInput: (v) => Math.round(v),
    fromInput: (v) => Math.max(0, Math.min(1_000_000, Math.round(v))),
  },
  {
    key: "income_regularity",
    label: "Income Regularity",
    display: (v) => `${Math.round(v * 100)}%`,
    editSuffix: "%",
    editStep: 1,
    editMin: 0,
    editMax: 100,
    toInput: (v) => Math.round(v * 100),
    fromInput: (v) => Math.max(0, Math.min(1, v / 100)),
  },
  {
    key: "savings_ratio",
    label: "Savings Ratio",
    display: (v) => `${Math.round(v * 100)}%`,
    editSuffix: "%",
    editStep: 1,
    editMin: 0,
    editMax: 100,
    toInput: (v) => Math.round(v * 100),
    fromInput: (v) => Math.max(0, Math.min(1, v / 100)),
  },
  {
    key: "bill_payment_score",
    label: "Bills Paid On Time",
    display: (v) => `${v}/12`,
    editSuffix: "/12",
    editStep: 1,
    editMin: 0,
    editMax: 12,
    toInput: (v) => v,
    fromInput: (v) => Math.max(0, Math.min(12, Math.round(v))),
  },
  {
    key: "upi_frequency",
    label: "UPI Txns / month",
    display: (v) => `${v}`,
    editStep: 1,
    editMin: 0,
    editMax: 500,
    toInput: (v) => v,
    fromInput: (v) => Math.max(0, Math.min(500, Math.round(v))),
  },
  {
    key: "emi_burden_ratio",
    label: "EMI Burden",
    display: (v) => `${Math.round(v * 100)}%`,
    editSuffix: "%",
    editStep: 1,
    editMin: 0,
    editMax: 100,
    toInput: (v) => Math.round(v * 100),
    fromInput: (v) => Math.max(0, Math.min(1, v / 100)),
  },
  {
    key: "cash_dependency",
    label: "Cash Dependency",
    display: (v) => `${Math.round(v * 100)}%`,
    editSuffix: "%",
    editStep: 1,
    editMin: 0,
    editMax: 100,
    toInput: (v) => Math.round(v * 100),
    fromInput: (v) => Math.max(0, Math.min(1, v / 100)),
  },
  {
    key: "spending_discipline",
    label: "Spending Discipline",
    display: (v) => `${Math.round(v * 100)}%`,
    editSuffix: "%",
    editStep: 1,
    editMin: 0,
    editMax: 100,
    toInput: (v) => Math.round(v * 100),
    fromInput: (v) => Math.max(0, Math.min(1, v / 100)),
  },
  {
    key: "payment_streak",
    label: "Payment Streak",
    display: (v) => `${v} mo`,
    editSuffix: "mo",
    editStep: 1,
    editMin: 0,
    editMax: 12,
    toInput: (v) => v,
    fromInput: (v) => Math.max(0, Math.min(12, Math.round(v))),
  },
];

interface Props {
  features: FeatureSet;
  onChange: (f: FeatureSet) => void;
}

export function EditableSignalsPanel({ features, onChange }: Props) {
  const [editingKey, setEditingKey] = useState<keyof FeatureSet | null>(null);

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {SIGNALS.map((cfg, i) => (
        <SignalCard
          key={cfg.key}
          cfg={cfg}
          value={features[cfg.key]}
          editing={editingKey === cfg.key}
          delay={i * 0.04}
          onEditStart={() => setEditingKey(cfg.key)}
          onEditCancel={() => setEditingKey(null)}
          onSave={(stored) => {
            onChange({ ...features, [cfg.key]: stored });
            setEditingKey(null);
          }}
        />
      ))}
    </div>
  );
}

function SignalCard({
  cfg,
  value,
  editing,
  delay,
  onEditStart,
  onEditCancel,
  onSave,
}: {
  cfg: SignalConfig;
  value: number;
  editing: boolean;
  delay: number;
  onEditStart: () => void;
  onEditCancel: () => void;
  onSave: (stored: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(cfg.toInput(value)));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(cfg.toInput(value)));
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, value, cfg]);

  const commit = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n)) onSave(cfg.fromInput(n));
    else onEditCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-5 group relative"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
        {!editing && (
          <button
            type="button"
            onClick={onEditStart}
            className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-primary"
            aria-label={`Edit ${cfg.label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={onEditStart}
          className="font-display text-2xl font-bold tabular-nums text-left w-full hover:text-primary transition"
        >
          {cfg.display(value)}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {cfg.editPrefix && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {cfg.editPrefix}
              </span>
            )}
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={draft}
              step={cfg.editStep}
              min={cfg.editMin}
              max={cfg.editMax}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") onEditCancel();
              }}
              className={`w-full bg-background/50 border border-border rounded-md py-1.5 text-lg font-display font-bold tabular-nums focus:outline-none focus:border-primary ${cfg.editPrefix ? "pl-6" : "pl-2"} ${cfg.editSuffix ? "pr-8" : "pr-2"}`}
            />
            {cfg.editSuffix && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {cfg.editSuffix}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={commit}
            className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEditCancel}
            className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
