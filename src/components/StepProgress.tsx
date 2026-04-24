import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  steps: string[];
  current: number; // 0-indexed
}

export function StepProgress({ steps, current }: Props) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full grid place-items-center font-semibold border-2 transition-all",
                    done && "bg-success border-success text-success-foreground",
                    active && "bg-primary border-primary text-primary-foreground animate-pulse-glow",
                    !done && !active && "bg-secondary border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs text-center font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="h-0.5 flex-1 mx-2 -mt-6 rounded">
                  <div
                    className={cn(
                      "h-full rounded transition-all",
                      i < current ? "bg-success" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
