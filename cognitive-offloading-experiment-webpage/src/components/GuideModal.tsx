import { useEffect, useRef } from "react";
import type { Topic } from "../content";

/**
 * Help guide overlay. It can only be dismissed with the explicit close button
 * (no backdrop click / Escape), so the guide and the editor are never usable together.
 */
export default function GuideModal({ topic, onClose }: { topic: Topic; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
      if (e.key === "Tab") {
        // keep focus inside the dialog (only one focusable element)
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(37,37,37,0.45)] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:max-h-[85dvh] sm:max-w-xl sm:rounded-lg">
        <div className="border-b border-line px-5 py-4 sm:px-7">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Help guide</p>
          <h2 id="guide-title" className="mt-1 text-lg leading-snug font-semibold text-navy">
            {topic.name}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <p className="mb-4 text-sm text-muted">Important points related to this topic:</p>
          <ol className="space-y-4">
            {topic.pointers.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-navy text-xs font-medium text-navy">
                  {i + 1}
                </span>
                <div className="text-[15px]">
                  <span className="font-semibold">{p.title}:</span> {p.text}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-line px-5 py-4 sm:px-7">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-navy px-6 py-3 text-base font-medium text-white hover:bg-navy-dark"
          >
            Close Guide and Continue Writing
          </button>
        </div>
      </div>
    </div>
  );
}
