import { useEffect, useRef, useState } from "react";
import Break from "./components/Break";
import type { SaveStatus } from "./components/Break";
import Consent from "./components/Consent";
import type { ConsentData } from "./components/Consent";
import Finish from "./components/Finish";
import Instructions from "./components/Instructions";
import Task from "./components/Task";
import { Shell } from "./components/ui";
import { SEQUENCES } from "./content";
import { flush, logEvent, register, setContext, startParticipant } from "./store";

type Stage = "consent" | "instructions" | "task1" | "break" | "task2" | "finish";
const STEP: Record<Stage, number> = { consent: 0, instructions: 1, task1: 2, break: 3, task2: 4, finish: 5 };

export default function App() {
  const [stage, setStage] = useState<Stage>("consent");
  const [sequence, setSequence] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saving");
  const [timedOut, setTimedOut] = useState(false);
  const [locked, setLocked] = useState(false); // true while leaving the page would risk losing data
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const plan = sequence ? SEQUENCES[sequence] : null;

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  };

  /* Keep the stage's condition label on every logged event */
  useEffect(() => {
    if (stage === "task1" && plan) setContext(plan[0].cond);
    else if (stage === "task2" && plan) setContext(plan[1].cond);
    else if (stage === "break") setContext("Break");
    else setContext("General");
    window.scrollTo(0, 0);
  }, [stage, plan]);

  /* Warn before refresh / closing the tab */
  useEffect(() => {
    if (!locked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [locked]);

  /* Block the browser Back button during the experiment */
  useEffect(() => {
    history.pushState({ coe: true }, "", location.href);
    const onPop = () => {
      history.pushState({ coe: true }, "", location.href);
      if (stage !== "consent") {
        logEvent("Back navigation blocked", "");
        showNotice("Please use the buttons on the page to move forward. The browser back button is disabled during this activity.");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* Log fullscreen changes */
  useEffect(() => {
    const onFs = () => logEvent("Fullscreen changed", document.fullscreenElement ? "entered" : "exited");
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleConsent = async (d: ConsentData) => {
    startParticipant(d);
    const seq = await register();
    setSequence(seq);
    setLocked(true);
    setStage("instructions");
  };

  const handleBegin = async () => {
    // Attempt full-screen (requires this user gesture; unsupported on some mobile browsers).
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        await el.requestFullscreen();
        logEvent("Fullscreen requested", "granted", "General");
      } else {
        logEvent("Fullscreen requested", "not_supported", "General");
      }
    } catch {
      logEvent("Fullscreen requested", "declined_or_failed", "General");
    }
    setStage("task1");
  };

  const saveCondition = async () => {
    setSaveStatus("saving");
    try {
      await flush("condition");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("failed");
    }
  };

  const handleTask1Done = (status: "Completed" | "Timed_Out") => {
    setTimedOut(status === "Timed_Out");
    setStage("break");
    void saveCondition();
  };

  return (
    <Shell step={STEP[stage]} notice={notice}>
      {stage === "consent" && <Consent onContinue={handleConsent} />}
      {stage === "instructions" && <Instructions onBegin={handleBegin} />}
      {stage === "task1" && plan && (
        <Task key="task1" condId={plan[0].cond} topicId={plan[0].topic} order={1} onDone={handleTask1Done} />
      )}
      {stage === "break" && (
        <Break
          saveStatus={saveStatus}
          timedOut={timedOut}
          onRetry={saveCondition}
          onContinue={() => {
            logEvent("Break ended", "participant continued to second task", "Break");
            setStage("task2");
          }}
        />
      )}
      {stage === "task2" && plan && (
        <Task key="task2" condId={plan[1].cond} topicId={plan[1].topic} order={2} onDone={() => setStage("finish")} />
      )}
      {stage === "finish" && <Finish onSaved={() => setLocked(false)} />}
    </Shell>
  );
}
