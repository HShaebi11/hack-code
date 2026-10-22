import { Header } from "@/components/header";
import { ImportForm } from "@/components/import-form";
import { SyncNow } from "@/components/sync-now";
import { getOverviewCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const counts = await getOverviewCounts();

  return (
    <>
      <Header counts={counts} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <p className="text-sm text-[color:var(--muted)]">
          For Hack Code · lead in the room
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">
          The group chat remembers. The lead shouldn&apos;t have to scroll it.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
          Hack Code&apos;s memory is buried in WhatsApp, so events get planned
          blind. Import the export, sync public Luma London, then ask Cursor
          who knows what — every name comes with a source.
        </p>

        {!counts.configured ? (
          <p className="mt-6 rounded-lg border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm">
            Add Supabase keys to <code>.env.local</code>, run both files in{" "}
            <code>supabase/migrations</code>, then import. Grok needs{" "}
            <code>XAI_API_KEY</code> (keyword extract still works without it).
          </p>
        ) : null}

        {counts.sources.length > 0 ? (
          <ul className="mt-8 space-y-2 text-sm">
            {counts.sources.map((source) => (
              <li key={source.id} className="flex flex-wrap gap-2">
                <span className="font-medium">{source.name}</span>
                <span className="text-[color:var(--muted)]">{source.type}</span>
                {source.synced_at ? (
                  <span className="text-[color:var(--muted)]">
                    synced {new Date(source.synced_at).toLocaleString("en-GB")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-sm text-[color:var(--muted)]">No sources yet.</p>
        )}

        <div className="mt-8">
          <SyncNow />
        </div>

        <div className="mt-10 rounded-2xl border border-[color:var(--line)] bg-[color:var(--chip)]/40 p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Demo data labelled below · use a real Hack Code export if you have one
          </p>
          <ImportForm />
        </div>

        <p className="mt-6 text-sm text-[color:var(--muted)]">
          Then in Cursor: <code>who_knows(&quot;evals&quot;)</code> · then{" "}
          <code>who_knows(&quot;underwater welding&quot;)</code> for the honest
          empty answer. MCP: <code>/api/mcp</code>
        </p>
      </main>
    </>
  );
}