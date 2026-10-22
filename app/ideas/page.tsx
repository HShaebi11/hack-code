import Link from "next/link";
import { Header } from "@/components/header";
import { getOverviewCounts, listIdeas, listPeople } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const peopleTab = tab === "people";
  const [counts, ideas, people] = await Promise.all([
    getOverviewCounts(),
    listIdeas(),
    listPeople(),
  ]);

  return (
    <>
      <Header counts={counts} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <p className="text-sm text-[color:var(--muted)]">Organised artefacts</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Ideas</h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          Not a chat log. Each row is something Hack Code already said, with who
          and when. Pick one if you want an internal event brief.
        </p>

        <div className="mt-6 flex gap-3 text-sm">
          <Link
            href="/ideas"
            className={!peopleTab ? "underline" : "text-[color:var(--muted)]"}
          >
            Ideas ({ideas.length})
          </Link>
          <Link
            href="/ideas?tab=people"
            className={peopleTab ? "underline" : "text-[color:var(--muted)]"}
          >
            People ({people.length})
          </Link>
        </div>

        {peopleTab ? (
          <ul className="mt-6 divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
            {people.length === 0 ? (
              <li className="py-8 text-[color:var(--muted)]">
                Import first. People show up from the export, not a directory.
              </li>
            ) : (
              people.map((person) => (
                <li key={person.id} className="py-4">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-[color:var(--muted)]">
                    {person.note || "In the imported thread."}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--line)] text-[color:var(--muted)]">
                  <th className="py-3 pr-4 font-medium">Idea</th>
                  <th className="py-3 pr-4 font-medium">Who</th>
                  <th className="py-3 font-medium">Source + date</th>
                </tr>
              </thead>
              <tbody>
                {ideas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-[color:var(--muted)]">
                      Brain is empty.{" "}
                      <Link href="/" className="underline">
                        Import
                      </Link>{" "}
                      a WhatsApp export.
                    </td>
                  </tr>
                ) : (
                  ideas.map((idea) => (
                    <tr key={idea.id} className="border-b border-[color:var(--line)]">
                      <td className="py-3 pr-4">
                        <Link href={`/ideas/${idea.id}`} className="font-medium hover:underline">
                          {idea.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{idea.author ?? "—"}</td>
                      <td className="py-3 text-[color:var(--muted)]">{idea.citation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
