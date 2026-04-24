import { CreditCard, Github } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/60 mt-24">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">
              Credit <span className="text-gradient-gold">Vista</span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
            Explainable AI credit scoring for the 190 million credit-invisible Indians. Built on
            behavioural signals from UPI, bills and spending — never on CIBIL data.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/score" className="hover:text-foreground transition">Get Your Score</Link></li>
            <li><Link to="/retrieve" className="hover:text-foreground transition">Retrieve Score</Link></li>
            <li><Link to="/about" className="hover:text-foreground transition">How It Works</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Resources</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground transition">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground transition">Disclaimer</a></li>
            <li>
              <a href="#" className="hover:text-foreground transition inline-flex items-center gap-1">
                <Github className="h-4 w-4" /> GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="container py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Credit Vista. Prototype — not an official credit assessment.</p>
          <p className="text-accent">Built for InnovFest 2026</p>
        </div>
      </div>
    </footer>
  );
}
