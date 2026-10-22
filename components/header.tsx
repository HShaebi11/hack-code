import Link from "next/link";

export function Header({
  counts,
}: {
  counts?: { messages: number; ideas: number; people: number; lumaEvents?: number };
}) {
  return (
    <header className="border-b border-[color:var(--line)]">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-6 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Grapevine
          </p>
          <Link href="/" className="font-semibold tracking-tight">
            Hack Code
          </Link>
          <p className="mt-1 max-w-md text-sm text-[color:var(--muted)]">
            Everything this community has said, in one place — with the source.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Import
          </Link>
          <Link href="/ideas" className="hover:underline">
            Ideas
          </Link>
          {counts ? (
            <span className="text-[color:var(--muted)]">
              {counts.messages} messages · {counts.ideas} ideas · {counts.people} people
              {typeof counts.lumaEvents === "number" ? ` · ${counts.lumaEvents} Luma` : ""}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}