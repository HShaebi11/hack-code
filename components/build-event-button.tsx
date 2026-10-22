"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BuildEventButton({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/event`, { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Could not build the page");
        setBusy(false);
        return;
      }
      router.push(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the page");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--paper)] disabled:opacity-50"
      >
        {busy ? "Building event page…" : "Build me an event page of this idea"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
