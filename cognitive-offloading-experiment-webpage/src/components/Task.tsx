import { useEffect, useRef, useState } from "react";
import { MAX_WORDS, MIN_WORDS, WRITING_SECONDS } from "../config";
import { CONDITIONS, getTopic } from "../content";
import type { CondId } from "../content";
import { addResponse, getParticipantId, logEvent, nowISO } from "../store";
import GuideModal from "./GuideModal";
import { Btn, Card, fmtClock } from "./ui";

type Phase = "ready" | "guide" | "writing" | "done";

export const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

interface Props {
  condId: CondId;
  topicId: string;
  order: 1 | 2;
  onDone: (status: "Completed" | "Timed_Out") => void;
}

export default function Task({ condId, topicId, order, onDone }: Props) {
  const cond = CONDITIONS[condId];
  const topic = getTopic(topicId);

  const [phase, setPhase] = useState<Phase>("ready");
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState(WRITING_SECONDS);
  const [started, setStarted] = useState(false);
  const [showWarn, setShowWarn] = useState(false);
  const [pasteMsg, setPasteMsg] = useState(false);

  const textRef = useRef("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const m = useRef({
    initialised: false,
    finished: false,
    guideOpen: false,
    guideOpenedMs: 0,
    guideTotalMs: 0,
    guideCount: 0,
    firstOpen: "",
    lastClose: "",
    startMs: 0,
    startISO: "",
    firstKey: false,
    hiddenSince: 0,
    hiddenTotalMs: 0,
    switches: 0,
  });
  const finishRef = useRef<(s: "Completed" | "Timed_Out") => void>(() => {});

  const wc = countWords(text);
  const valid = wc >= MIN_WORDS && wc <= MAX_WORDS;

  /* ---- condition start ---- */
  useEffect(() => {
    if (m.current.initialised) return;
    m.current.initialised = true;
    logEvent(
      "Condition started",
      `condition=${condId}; framing=${cond.framing}; topic=${topic.id}; order=${order}; initial_marks=${cond.initialMarks}`
    );
  }, [condId, cond.framing, cond.initialMarks, topic.id, order]);

  /* ---- page visibility ---- */
  useEffect(() => {
    const onVis = () => {
      const s = m.current;
      if (s.finished) return;
      if (document.hidden) {
        s.hiddenSince = Date.now();
        s.switches += 1;
        logEvent("Tab visibility changed", `hidden; switch_count=${s.switches}`);
      } else if (s.hiddenSince) {
        const d = Date.now() - s.hiddenSince;
        s.hiddenTotalMs += d;
        s.hiddenSince = 0;
        logEvent("Tab visibility changed", `visible; hidden_seconds=${(d / 1000).toFixed(1)}`);
        setShowWarn(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ---- writing timer (based on wall-clock so background throttling does not matter) ---- */
  useEffect(() => {
    if (!started) return;
    const deadline = m.current.startMs + WRITING_SECONDS * 1000;
    const tick = () => {
      const r = Math.ceil((deadline - Date.now()) / 1000);
      setRemaining(Math.max(0, r));
      if (r <= 0) finishRef.current("Timed_Out");
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [started]);

  /* focus editor when writing begins / resumes */
  useEffect(() => {
    if (phase === "writing") areaRef.current?.focus({ preventScroll: true });
  }, [phase]);

  /* ---- actions ---- */
  const closeGuideInternal = () => {
    const s = m.current;
    if (!s.guideOpen) return;
    const d = Date.now() - s.guideOpenedMs;
    s.guideOpen = false;
    s.guideTotalMs += d;
    s.lastClose = nowISO();
    logEvent("Help guide closed", `duration_seconds=${(d / 1000).toFixed(1)}; total_seconds=${(s.guideTotalMs / 1000).toFixed(1)}`);
  };

  const beginWriting = (how: string) => {
    const s = m.current;
    if (s.startMs) return;
    s.startMs = Date.now();
    s.startISO = nowISO();
    logEvent("Writing started", how);
    setStarted(true);
    setPhase("writing");
  };

  const openGuide = () => {
    const s = m.current;
    if (s.guideOpen || s.finished) return;
    s.guideOpen = true;
    s.guideOpenedMs = Date.now();
    s.guideCount += 1;
    if (!s.firstOpen) s.firstOpen = nowISO();
    logEvent("Help guide opened", `open_count=${s.guideCount}; stage=${s.startMs ? "during_writing" : "before_writing"}`);
    setPhase("guide");
  };

  const closeGuide = () => {
    closeGuideInternal();
    if (!m.current.startMs) beginWriting("after_viewing_guide");
    else setPhase("writing");
  };

  const finish = (status: "Completed" | "Timed_Out") => {
    const s = m.current;
    if (s.finished) return;
    s.finished = true;
    closeGuideInternal();
    if (s.hiddenSince) {
      s.hiddenTotalMs += Date.now() - s.hiddenSince;
      s.hiddenSince = 0;
    }
    const endMs = Date.now();
    const finalText = textRef.current;
    const words = countWords(finalText);
    const duration = Math.min((endMs - s.startMs) / 1000, WRITING_SECONDS);
    addResponse({
      Participant_ID: getParticipantId(),
      Condition: condId,
      Condition_Order: order,
      Essay_Topic: topic.name,
      Initial_Marks: cond.initialMarks,
      Framing_Type: cond.framing,
      Help_Guide_Opened: s.guideCount > 0 ? "Yes" : "No",
      Help_Guide_Open_Time: s.firstOpen,
      Help_Guide_Close_Time: s.lastClose,
      Help_Guide_Duration_Seconds: Number((s.guideTotalMs / 1000).toFixed(1)),
      Essay_Start_Time: s.startISO,
      Essay_Submission_Time: nowISO(),
      Writing_Duration_Seconds: Number(duration.toFixed(1)),
      Essay_Response: finalText,
      Word_Count: words,
      Submission_Status: status,
      Within_Word_Limit: words >= MIN_WORDS && words <= MAX_WORDS ? "Yes" : "No",
      Help_Guide_Open_Count: s.guideCount,
      Tab_Switch_Count: s.switches,
      Total_Hidden_Seconds: Number((s.hiddenTotalMs / 1000).toFixed(1)),
      Topic_ID: topic.id,
    });
    logEvent("Essay submitted", `status=${status}; words=${words}; duration_seconds=${duration.toFixed(1)}`);
    setPhase("done");
    onDone(status);
  };
  finishRef.current = finish;

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    textRef.current = e.target.value;
    setText(e.target.value);
    if (!m.current.firstKey) {
      m.current.firstKey = true;
      logEvent("First keystroke", `latency_seconds=${((Date.now() - m.current.startMs) / 1000).toFixed(1)}`);
    }
  };

  const blockPaste = (e: React.SyntheticEvent) => {
    e.preventDefault();
    logEvent("Paste or drop blocked", "");
    setPasteMsg(true);
  };

  const locked = phase === "ready" || phase === "guide";
  const lowTime = remaining <= 60;
  const countColour = wc > MAX_WORDS ? "text-alert" : valid ? "text-navy" : "text-muted";

  return (
    <div>
      {started && (
        <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className={countColour}>
              Words: <span className="font-semibold tabular-nums">{wc}</span>
              <span className="text-muted"> &nbsp;(required {MIN_WORDS}–{MAX_WORDS})</span>
            </div>
            <div className={lowTime ? "text-alert" : "text-muted"}>
              Time left: <span className="font-semibold tabular-nums">{fmtClock(remaining)}</span>
            </div>
          </div>
        </div>
      )}

      {showWarn && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-4 rounded-md border border-[#d9c9a3] bg-[#fbf6e9] px-4 py-3 text-sm"
        >
          <span>Please remain on this page until the task is completed.</span>
          <button type="button" onClick={() => setShowWarn(false)} className="shrink-0 font-medium text-navy underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <h1 className="text-xl font-semibold text-navy">{cond.scoreHeading}</h1>
          <div className="mt-4 space-y-3 text-[15px]">
            {cond.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Essay Topic</p>
          <h2 className="mt-1 text-xl leading-snug font-semibold">{topic.name}</h2>
          <p className="mt-3 text-[15px]">{topic.instruction}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            <span>Word limit: {MIN_WORDS}–{MAX_WORDS} words.</span>
            <span>Time allowed: {WRITING_SECONDS / 60} minutes.</span>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Writing section</h2>
            {phase === "writing" && (
              <Btn variant="secondary" className="min-h-10 px-4 py-2 text-sm" onClick={openGuide}>
                View Help Guide
              </Btn>
            )}
          </div>

          {phase === "ready" && (
            <div className="mt-4">
              <p className="text-sm text-muted">
                The writing area becomes available after you choose an option below. The {WRITING_SECONDS / 60}-minute
                timer starts when writing begins.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Btn variant="secondary" className="sm:flex-1" onClick={openGuide}>
                  View Help Guide
                </Btn>
                <Btn className="sm:flex-1" onClick={() => beginWriting("without_viewing_guide")}>
                  Start Writing
                </Btn>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="essay" className="sr-only">
              Your essay
            </label>
            <textarea
              id="essay"
              ref={areaRef}
              value={text}
              onChange={onChange}
              onPaste={blockPaste}
              onDrop={blockPaste}
              disabled={locked}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder={locked ? "The writing area will be available once you choose an option above." : "Write your essay here."}
              className="block min-h-[50vh] w-full resize-y rounded-md border border-line bg-white p-4 text-[16px] leading-relaxed text-ink placeholder:text-[#a5a5a0] focus:border-navy focus:outline-none disabled:bg-[#f1f1ed] sm:min-h-[22rem]"
            />
          </div>

          {phase === "writing" && (
            <div className="mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-sm ${wc > MAX_WORDS ? "text-alert" : "text-muted"}`} aria-live="polite">
                  {wc < MIN_WORDS
                    ? `Please write at least ${MIN_WORDS} words to submit (${MIN_WORDS - wc} to go).`
                    : wc > MAX_WORDS
                      ? `Please shorten your response by ${wc - MAX_WORDS} words to submit.`
                      : "Your response is within the word limit."}
                </p>
                <Btn className="w-full sm:w-auto" disabled={!valid} onClick={() => finish("Completed")}>
                  Submit Response
                </Btn>
              </div>
              <p className="mt-2 text-xs text-muted">
                If time runs out, your response is saved automatically. Pasting text is disabled.
                {pasteMsg && " (Paste blocked.)"}
              </p>
            </div>
          )}
        </Card>
      </div>

      {phase === "guide" && <GuideModal topic={topic} onClose={closeGuide} />}
    </div>
  );
}
