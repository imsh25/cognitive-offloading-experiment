import { DEMO_MODE, ENDPOINT } from "./config";
import { topicRows } from "./content";

export type Row = Record<string, string | number>;

interface State {
  participant: Row | null;
  responses: Row[];
  events: Row[];
  acked: number; // number of events already confirmed saved
  context: string; // current condition label used for events
}

const state: State = { participant: null, responses: [], events: [], acked: 0, context: "General" };

/** All timestamps are stored as UTC ISO-8601 strings. */
export const nowISO = () => new Date().toISOString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function persist() {
  try {
    localStorage.setItem("coe_backup", JSON.stringify(state));
  } catch {
    /* storage may be unavailable; ignore */
  }
}

export function generateParticipantId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return "P-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const getParticipantId = (): string => (state.participant?.Participant_ID as string) ?? "UNKNOWN";

export function setContext(ctx: string) {
  state.context = ctx;
}

export function logEvent(type: string, details = "", condition?: string) {
  const pid = (state.participant?.Participant_ID as string) ?? "UNKNOWN";
  state.events.push({
    Event_ID: `${pid}-${String(state.events.length + 1).padStart(4, "0")}`,
    Participant_ID: pid,
    Condition: condition ?? state.context,
    Event_Type: type,
    Event_Timestamp: nowISO(),
    Event_Details: details,
  });
  persist();
}

export interface Demographics {
  id: string;
  name: string;
  age: number;
  gender: string;
  education: string;
}

export function startParticipant(d: Demographics) {
  const t = nowISO();
  state.participant = {
    Participant_ID: d.id,
    Name: d.name,
    Age: d.age,
    Gender: d.gender,
    Educational_Qualification: d.education,
    Consent_Status: "Consented",
    Experiment_Date: t.slice(0, 10),
    Experiment_Start_Time: t,
    Experiment_End_Time: "",
    Assigned_Sequence: "",
    Completion_Status: "In_Progress",
    Assignment_Method: "",
    Device_Info: `${navigator.userAgent} | screen ${screen.width}x${screen.height} | viewport ${window.innerWidth}x${window.innerHeight}`,
  };
  persist();
}

export function addResponse(row: Row) {
  // Never overwrite a completed condition
  if (state.responses.some((r) => r.Condition === row.Condition)) return;
  state.responses.push(row);
  persist();
}

export function markCompleted() {
  if (!state.participant) return;
  state.participant.Experiment_End_Time = nowISO();
  state.participant.Completion_Status = "Completed";
  persist();
}

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

interface PostOpts {
  timeout?: number;
  attempts?: number;
}

async function post(payload: unknown, { timeout = 20000, attempts = 3 }: PostOpts = {}) {
  if (DEMO_MODE) {
    persist();
    return { ok: true } as { ok: boolean; sequence?: number; error?: string };
  }
  let lastErr: unknown = new Error("Unknown error");
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      // text/plain keeps this a "simple" request (no CORS pre-flight) which Apps Script requires.
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const json = (await res.json()) as { ok: boolean; sequence?: number; error?: string };
      if (json && json.ok) return json;
      throw new Error(json?.error || "The server did not confirm the save.");
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (i < attempts - 1) await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

/**
 * Registers the participant and obtains a counterbalanced sequence (1-4).
 * Server-side assignment keeps the four sequences balanced across all participants.
 * Falls back to local alternation (preview) or random assignment (server unreachable).
 */
export async function register(): Promise<number> {
  let seq = 0;
  let method = "";
  if (!DEMO_MODE) {
    try {
      const res = await post(
        { type: "register", participant: state.participant, topics: topicRows() },
        { timeout: 8000, attempts: 2 }
      );
      if (res.sequence && res.sequence >= 1 && res.sequence <= 4) {
        seq = res.sequence;
        method = "server_balanced";
      }
    } catch {
      /* fall through to fallback */
    }
  }
  if (!seq) {
    if (DEMO_MODE) {
      let counter = 0;
      try {
        counter = parseInt(localStorage.getItem("coe_seq_counter") || "0", 10) || 0;
        localStorage.setItem("coe_seq_counter", String(counter + 1));
      } catch {
        counter = Math.floor(Math.random() * 4);
      }
      seq = (counter % 4) + 1;
      method = "local_alternating";
    } else {
      seq = Math.floor(Math.random() * 4) + 1;
      method = "client_random_fallback";
    }
  }
  if (state.participant) {
    state.participant.Assigned_Sequence = seq;
    state.participant.Assignment_Method = method;
  }
  logEvent("Participant registered", `sequence=${seq}; method=${method}`, "General");
  return seq;
}

/**
 * Sends the full participant record, all completed conditions and any unsent events.
 * Server upserts by key, so repeated sends never create duplicates or overwrite other conditions.
 */
export async function flush(type: "condition" | "final"): Promise<void> {
  const n = state.events.length;
  await post({
    type,
    participant: state.participant,
    responses: state.responses,
    events: state.events.slice(state.acked),
  });
  state.acked = Math.max(state.acked, n);
  persist();
}
