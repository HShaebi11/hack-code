import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { getEvent } from "@/lib/generate-event";
import { getOverviewCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

function citationList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, counts] = await Promise.all([getEvent(id), getOverviewCounts()]);
  if (!bundle) notFound();
  const { event, people, idea } = bundle;
  const citations = citationList(event.citations);

  return (
    <>
      <Header counts={counts} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Internal brief · status {event.status}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{event.title}</h1>
        <p className="mt-4 text-xl leading-8">{event.pitch}</p>

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Why this community / why now
          </h2>
          <p className="mt-3 leading-7">{event.why_now}</p>
        </section>

        {idea ? (
          <section className="mt-10">
            <h2 className="text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Idea this came from
            </h2>
            <p className="mt-3">
              <Link href={`/ideas/${idea.id}`} className="underline">
                {idea.title}
              </Link>
              <span className="text-[color:var(--muted)]"> — {idea.author}</span>
            </p>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Suggested speakers
          </h2>
          <ul className="mt-4 space-y-4">
            {people.map((person) => (
              <li key={person.id}>
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-[color:var(--muted)]">{person.why}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Citations
          </h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-[color:var(--muted)]">
            {citations.map((citation) => (
              <li key={citation}>{citation}</li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
