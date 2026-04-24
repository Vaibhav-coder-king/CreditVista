import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { useVista } from "@/state/VistaContext";
import { loadResultByPin } from "@/lib/storage";
import { KeyRound, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Retrieve() {
  const { state, dispatch } = useVista();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const find = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("Enter your 4-digit PIN");
      return;
    }
    setLoading(true);
    setNotFound(false);
    const rec = await loadResultByPin(pin);
    setLoading(false);
    if (!rec) {
      setNotFound(true);
      return;
    }
    dispatch({
      type: "LOAD_SAVED",
      profile: { name: rec.profile.name, employment: rec.profile.employment, income: rec.profile.income, pin },
      features: rec.features,
      result: rec.result,
    });
    toast.success("Score retrieved");
  };

  return (
    <div className="container py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 md:p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-accent/15 grid place-items-center text-accent mb-4">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold">Retrieve Your Credit Score</h1>
          <p className="text-muted-foreground mt-2">
            Enter the 4-digit PIN you created when you generated your score.
          </p>

          <div className="mt-6 max-w-xs mx-auto">
            <Label htmlFor="pin" className="sr-only">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="tracking-[0.6em] text-center text-2xl font-mono h-14"
              onKeyDown={(e) => e.key === "Enter" && find()}
            />
          </div>

          <Button variant="gold" size="lg" className="mt-6" onClick={find} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find My Score
          </Button>

          {notFound && (
            <div className="mt-6 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
              No results found for that PIN. <Link to="/score" className="text-primary underline ml-1">Generate a new score →</Link>
            </div>
          )}
        </motion.div>

        {state.result && !notFound && (
          <div className="mt-10">
            <ResultsDashboard result={state.result} profileName={state.profile.name} pin={pin} />
          </div>
        )}
      </div>
    </div>
  );
}
