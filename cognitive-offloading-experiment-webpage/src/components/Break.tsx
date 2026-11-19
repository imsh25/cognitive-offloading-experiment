import { useEffect, useState } from "react";
import { BREAK_SECONDS } from "../config";
import { Btn, Card, fmtClock } from "./ui";

export type SaveStatus = "saving" | "saved" | "failed";

interface Props {
  saveStatus: SaveStatus;
  timedOut: boolean;
  onRetry: () => void;
  onContinue: () => void;
}

export default function Break({ saveStatus, timedOut, onRetry, onContinue }: Props) {
  const [remaining, setRemaining] = useState(BREAK_SECONDS);

  useEffect(() => {
    const end = Date.now() + BREAK_SECONDS * 1000;
    const id = setInterval(() => {
      const r = Math.ceil((end - Date.now()) / 1000);
      setRemaining(Math.max(0, r));
      if (r <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <h1 className="text-xl font-semibold text-navy">First Task Completed</h1>
      <div className="mt-4 space-y-3 text-[15px]">
        {timedOut && <p>The time for this task has ended and your response was saved.</p>}
        <p>Thank you. You have completed the first writing task.</p>
        <p>Please take a short break before proceeding to the next task.</p>
      </div>

      <div className="mt-8 text-center">
        {remaining > 0 ? (
          <>
            <div className="text-4xl font-medium text-navy tabular-nums" aria-live="off">
              {fmtClock(remaining)}
            </div>
            <p className="mt-1 text-sm text-muted">The next task will be available when the countdown ends.</p>
          </>
        ) : (
          <Btn className="w-full sm:w-auto" onClick={onContinue}>
            Continue to Next Task
          </Btn>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-4 text-sm text-muted" aria-live="polite">
        {saveStatus === "saving" && <p>Saving your response…</p>}
        {saveStatus === "saved" && <p>Your response has been saved.</p>}
        {saveStatus === "failed" && (
          <div>
            <p className="text-alert">
              Your response could not be saved just now. It is kept safely on this page and will be sent again
              automatically at the end. You may also try again now.
            </p>
            <Btn variant="secondary" className="mt-3 min-h-10 px-4 py-2 text-sm" onClick={onRetry}>
              Retry saving
            </Btn>
          </div>
        )}
      </div>
    </Card>
  );
}
