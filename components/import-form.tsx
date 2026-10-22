"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SourceChoice = "whatsapp" | "discord" | "slack" | "paste";

type Step = "idle" | "parsing" | "extracting" | "done" | "error";

export function ImportForm() {
  const router = useRouter();
  const [source, setSource] = useState<SourceChoice>("whatsapp");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{
    messages: number;
    ideas: number;
    people: number;
    expertise?: number;
  } | null>(null);

  const stubbed = source === "discord" || source === "slack";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stubbed) return;
    setError(null);
    setCounts(null);
    setStep("parsing");
    const body = new FormData();
    body.set("sourceType", source);
    if (file) body.set("file", file);
    if (text) body.set("text", text);
    window.setTimeout(() => setStep("extracting"), 400);
    try {
      const response = await fetch("/api/import", { method: "POST", body });
      const payload = (await response.json()) as {
        error?: string;
        counts?: { messages: number; ideas: number; people: number; expertise?: number };
      };
      if (!response.ok) {
        setStep("error");
        setError(payload.error ?? "Import failed");
        return;
      }
      setCounts(payload.counts ?? null);
      setStep("done");
      router.refresh();
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="grid gap-2 sm:grid-cols-4">
        {(
          [
            ["whatsapp", "WhatsApp .txt"],
            ["paste", "Paste"],
            ["discord", "Discord"],
            ["slack", "Slack"],
          ] as const
        ).map(([value, label]) => {
          const disabled = value === "discord" || value === "slack";
          return (
            <label
              key={value}
              className={`rounded-lg border px-3 py-3 text-sm ${
                source === value
                  ? "border-[color:var(--ink)] bg-[color:var(--chip)]"
                  : "border-[color:var(--line)]"
              } ${disabled ? "opacity-50" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="source"
                value={value}
                className="sr-only"
                checked={source === value}
                disabled={disabled}
                onChange={() => setSource(value)}
              />
              <span className="block font-medium">{label}</span>
              {disabled ? (
                <span className="text-xs text-[color:var(--muted)]">Connect later</span>
              ) : (
                <span className="text-xs text-[color:var(--muted)]">Ready</span>
              )}
            </label>
          );
        })}
      </fieldset>

      {source !== "paste" ? (
        <label className="block space-y-2 text-sm">
          <span>Export file</span>
          <input
            type="file"
            accept=".txt,text/plain"
            className="block w-full text-sm"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setFileName(next?.name ?? null);
            }}
          />
          {fileName ? (
            <span className="text-[color:var(--muted)]">{fileName}</span>
          ) : (
            <span className="text-[color:var(--muted)]">
              Demo data: fixtures/hack-code-whatsapp.txt. Prefer a real Hack Code export.
            </span>
          )}
        </label>
      ) : (
        <label className="block space-y-2 text-sm">
          <span>Paste export</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            className="w-full rounded-lg border border-[color:var(--line)] bg-transparent p-3 font-mono text-xs"
            placeholder="[12/10/2026, 19:02:44] Priya: Beginners track..."
          />
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={stubbed || step === "parsing" || step === "extracting"}
          className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--paper)] disabled:opacity-50"
        >
          {step === "parsing"
            ? "Messages in…"
            : step === "extracting"
              ? "Extracting…"
              : "Import"}
        </button>
        <button
          type="button"
          className="rounded-full border border-[color:var(--line)] px-5 py-2.5 text-sm"
          onClick={async () => {
            const response = await fetch("/hack-code-whatsapp.txt");
            const sample = await response.text();
            const blob = new File([sample], "hack-code-whatsapp.txt", {
              type: "text/plain",
            });
            setSource("whatsapp");
            setFile(blob);
            setFileName("hack-code-whatsapp.txt");
            setText("");
          }}
        >
          Use sample export
        </button>
      </div>

      <div className="text-sm text-[color:var(--muted)]">
        {step === "parsing" ? <p>Progress: messages in.</p> : null}
        {step === "extracting" ? <p>Progress: extracting ideas and people.</p> : null}
        {step === "done" && counts ? (
          <p>
            Proof: {counts.messages} messages → {counts.ideas} ideas, {counts.people}{" "}
            people
            {typeof counts.expertise === "number" ? `, ${counts.expertise} expertise` : ""}.{" "}
            <a href="/ideas" className="text-[color:var(--ink)] underline">
              Open Ideas
            </a>
          </p>
        ) : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </form>
  );
}
