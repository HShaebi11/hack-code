import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildEventButton } from "@/components/build-event-button";
import { Header } from "@/components/header";
import { getIdea, getOverviewCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [idea, counts] = await Promise.all([getIdea(id), getOverviewCounts()]);
  if (!idea) notFound();

  return (
    <>
      <Header counts={counts} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/ideas" className="text-sm text-[color:var(--muted)] hover:underline">
          ← Ideas
        </Link>
        <p className="mt-6 text-sm text-[color:var(--muted)]">{idea.citation}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{idea.title}</h1>
        <p className="mt-3 text-sm">
          {idea.author ?? "Unknown"} · {idea.citation}
        </p>
        <blockquote className="mt-8 border-l-2 border-[color:var(--ink)] pl-4 text-lg leading-8">
          {idea.body}
        </blockquote>
        <p className="mt-8 text-sm text-[color:var(--muted)]">
          1:40 — point at this idea. Say: build me an event page of this idea.
        </p>
        <div className="mt-4">
          <BuildEventButton ideaId={idea.id} />
        </div>
      </main>
    </>
  );
}
