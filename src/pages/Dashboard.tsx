import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { useVista } from "@/state/VistaContext";
import { ArrowRight, FileSearch } from "lucide-react";

export default function Dashboard() {
  const { state } = useVista();

  if (!state.result) {
    return (
      <div className="container py-20">
        <div className="max-w-md mx-auto glass-card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 grid place-items-center text-primary mb-4">
            <FileSearch className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold">No score generated yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a fresh Credit Vista score, or retrieve a previous one with your PIN.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="gold">
              <Link to="/score">Get my score <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline-blue">
              <Link to="/retrieve">Retrieve with PIN</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {state.profile.name ? `${state.profile.name}'s` : "Your"} Credit Vista Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Generated on {new Date(state.result.generatedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <ResultsDashboard result={state.result} profileName={state.profile.name} pin={state.profile.pin} />
      </div>
    </div>
  );
}
