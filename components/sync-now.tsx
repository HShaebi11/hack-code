"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncNow() {
  const router = useRouter();
  const [line, setLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        read?: number;
        inserted?: number;
        seconds?: number;
      };
      if (!response.ok) {
        setError(payload.error ?? "Sync failed");
        return;
      }
      setLine(
        `READ ${payload.read ?? 0} ITEMS · NEW ${payload.inserted ?? 0} · ${payload.seconds ?? 0}s`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-full border border-[color:var(--line)] px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? "Syncing Luma…" : "Sync now"}
      </button>
      {line ? <p className="text-sm">{line}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}