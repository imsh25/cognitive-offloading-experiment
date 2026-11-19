import type { ButtonHTMLAttributes, ReactNode } from "react";
import { DEMO_MODE } from "../config";

export const fmtClock = (secs: number) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Btn({ variant = "primary", className = "", ...rest }: BtnProps) {
  const base =
    "inline-flex min-h-12 items-center justify-center rounded-md px-6 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const styles =
    variant === "primary"
      ? "bg-navy text-white hover:bg-navy-dark disabled:hover:bg-navy"
      : "border border-navy bg-white text-navy hover:bg-[#eef1f5] disabled:hover:bg-white";
  return <button type="button" className={`${base} ${styles} ${className}`} {...rest} />;
}

const STEPS = ["Information", "Instructions", "Task 1", "Break", "Task 2", "Finish"];

export function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-navy" : "bg-line"}`} />
        ))}
      </div>
      <div className="mt-2 hidden justify-between text-xs text-muted sm:flex">
        {STEPS.map((s, i) => (
          <span key={s} className={i === step ? "font-medium text-navy" : ""}>
            {s}
          </span>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted sm:hidden">
        Step {step + 1} of {STEPS.length} &middot; <span className="font-medium text-navy">{STEPS[step]}</span>
      </div>
    </div>
  );
}

export function Shell({ step, children, notice }: { step: number; children: ReactNode; notice?: string | null }) {
  return (
    <div className="min-h-screen bg-paper">
      {DEMO_MODE && (
        <div className="border-b border-line bg-white px-4 py-2 text-center text-xs text-muted">
          Preview mode: no data endpoint is configured, so responses are stored only in this browser.
        </div>
      )}
      {notice && (
        <div role="alert" className="border-b border-[#d9c9a3] bg-[#fbf6e9] px-4 py-2 text-center text-sm text-ink">
          {notice}
        </div>
      )}
      <header className="mx-auto max-w-2xl px-4 pt-6 sm:pt-8">
        <p className="mb-5 text-xs font-medium tracking-wide text-muted uppercase">
          Writing and Information Processing Study
        </p>
        <Progress step={step} />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-7 ${className}`}>
      {children}
    </section>
  );
}
