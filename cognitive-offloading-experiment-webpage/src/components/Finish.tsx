import { useEffect, useRef, useState } from "react";
import { DEMO_MODE } from "../config";
import { flush, logEvent, markCompleted } from "../store";
import { Btn, Card } from "./ui";

export default function Finish({ onSaved }: { onSaved: () => void }) {
  const [status, setStatus] = useState<"saving" | "saved" | "failed">("saving");
  const started = useRef(false);

  const submit = async () => {
    setStatus("saving");
    try {
      await flush("final");
      setStatus("saved");
      onSaved();
    } catch {
      setStatus("failed");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    logEvent("Experiment completed", "both tasks finished", "General");
    markCompleted();
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "saving") {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-navy">Submitting your responses</h1>
        <p className="mt-4 text-[15px]">Please wait while your responses are saved. Do not close this page.</p>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-navy">Your responses have not been saved yet</h1>
        <p className="mt-4 text-[15px]">
          We could not reach the server, possibly because of a temporary internet problem. Your responses are kept on
          this page. Please check your connection and try again. Do not close or refresh this page.
        </p>
        <div className="mt-6">
          <Btn className="w-full sm:w-auto" onClick={submit}>
            Retry submission
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold text-navy">Thank You for Participating</h1>
        <div className="mt-4 space-y-3 text-[15px]">
          <p>You have successfully completed both writing tasks.</p>
          <p>Thank you for contributing to this research activity.</p>
          <p className="text-muted">Your responses have been submitted. You may now close this page.</p>
          {DEMO_MODE && (
            <p className="text-sm text-muted">
              Preview mode: responses were stored only in this browser because no data endpoint is configured.
            </p>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Debriefing</h2>
        <div className="mt-3 space-y-3 text-[15px]">
          <p>
            This study examined how different task framings may influence decisions to use external aids while writing.
            In both tasks the same optional help guide was available. The tasks differed only in how the marks for the
            task were described.
          </p>
          <p>
            The marks shown during the tasks were part of the scenario and were hypothetical. No marks were actually
            awarded or deducted, and your writing was not graded. No individual performance scores are provided, and
            your responses are not a judgement of your writing ability.
          </p>
          <p>If you have questions about this research, please contact the researcher who shared this link with you.</p>
        </div>
      </Card>
    </div>
  );
}
