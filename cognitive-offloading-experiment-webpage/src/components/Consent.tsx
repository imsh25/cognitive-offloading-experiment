import { useMemo, useState } from "react";
import { Btn, Card } from "./ui";
import { generateParticipantId } from "../store";

export interface ConsentData {
  id: string;
  name: string;
  age: number;
  gender: string;
  education: string;
}

const field =
  "w-full rounded-md border border-line bg-white px-3 py-3 text-ink placeholder:text-[#a5a5a0] focus:border-navy focus:outline-none";

export default function Consent({ onContinue }: { onContinue: (d: ConsentData) => Promise<void> }) {
  const id = useMemo(() => generateParticipantId(), []);
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!consent) err.consent = "You must agree to participate before continuing.";
    const a = Number(age);
    if (!age.trim() || !Number.isInteger(a) || a < 16 || a > 99) err.age = "Please enter a valid age (16–99).";
    if (!gender) err.gender = "Please select an option.";
    if (!education) err.education = "Please select an option.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    await onContinue({ id, name: name.trim(), age: a, gender, education });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold text-navy">A Study on Writing and Information Processing</h1>
        <p className="mt-4 text-[15px]">
          You are invited to participate in a short research activity involving two writing tasks. You will receive
          instructions before each task. Your participation is voluntary, and your responses will be used for academic
          research.
        </p>
        <p className="mt-3 text-[15px]">You may withdraw before submitting your responses.</p>
        <p className="mt-3 text-[15px]">Participation takes approximately 20–25 minutes.</p>

        <div className="mt-6 border-t border-line pt-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Consent</h2>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#263b56]"
              aria-describedby={errors.consent ? "err-consent" : undefined}
            />
            <span className="text-[15px]">
              I have read the information above, understand the nature of this research activity, and voluntarily agree
              to participate.
            </span>
          </label>
          {errors.consent && (
            <p id="err-consent" role="alert" className="mt-2 text-sm text-alert">
              {errors.consent}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Demographic information</h2>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="pid" className="mb-1.5 block text-sm font-medium">
              Participant ID
            </label>
            <input id="pid" value={id} readOnly className={`${field} bg-[#f1f1ed] text-muted`} />
            <p className="mt-1 text-xs text-muted">Generated automatically. No action needed.</p>
          </div>

          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className={field}
            />
            <p className="mt-1 text-xs text-muted">You may leave this blank.</p>
          </div>

          <div>
            <label htmlFor="age" className="mb-1.5 block text-sm font-medium">
              Age
            </label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={16}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={field}
            />
            {errors.age && (
              <p role="alert" className="mt-1 text-sm text-alert">
                {errors.age}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">
              Gender
            </label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={field}>
              <option value="">Select…</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
              <option>Prefer not to say</option>
              <option>Other</option>
            </select>
            {errors.gender && (
              <p role="alert" className="mt-1 text-sm text-alert">
                {errors.gender}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edu" className="mb-1.5 block text-sm font-medium">
              Educational qualification
            </label>
            <select id="edu" value={education} onChange={(e) => setEducation(e.target.value)} className={field}>
              <option value="">Select…</option>
              <option>Undergraduate</option>
              <option>Postgraduate</option>
              <option>Doctoral</option>
              <option>Other</option>
            </select>
            {errors.education && (
              <p role="alert" className="mt-1 text-sm text-alert">
                {errors.education}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div>
        <Btn
          variant="primary"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => submit({ preventDefault() {} } as React.FormEvent)}
        >
          {busy ? "Please wait…" : "Continue"}
        </Btn>
      </div>
    </form>
  );
}
