import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCommunity, lumaPermalink } from "@/lib/community";
import { getServiceClient } from "@/lib/supabase";

const LUMA_URL =
  "https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-QCcNk3HXowOR97j&pagination_limit=50";
const MAX_PAGES = 3;

export type SyncResult = {
  read: number;
  inserted: number;
  updated: number;
  seconds: number;
};

type LumaEntry = {
  api_id?: string;
  guest_count?: number;
  hosts?: Array<{ name?: string } | string>;
  calendar?: { name?: string };
  event?: {
    api_id?: string;
    name?: string;
    url?: string;
    start_at?: string;
    end_at?: string;
    geo_address_info?: { address?: string; city?: string };
  };
};

function hostName(entry: LumaEntry): string | null {
  const first = entry.hosts?.[0];
  if (!first) return null;
  if (typeof first === "string") return first;
  return first.name ?? null;
}

async function fetchPages(): Promise<{ entries: LumaEntry[]; raw: unknown[] }> {
  const entries: LumaEntry[] = [];
  const raw: unknown[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = cursor
      ? `${LUMA_URL}&pagination_cursor=${encodeURIComponent(cursor)}`
      : LUMA_URL;
    const response = await fetch(url, {
      headers: { "user-agent": "Grapevine/0.1 (community memory; cache-only)" },
    });
    if (!response.ok) {
      throw new Error(`Luma returned ${response.status}`);
    }
    const json = (await response.json()) as {
      entries?: LumaEntry[];
      next_cursor?: string;
      has_more?: boolean;
    };
    raw.push(json);
    entries.push(...(json.entries ?? []));
    if (!json.has_more || !json.next_cursor) break;
    cursor = json.next_cursor;
  }

  return { entries, raw };
}

export async function syncLuma(): Promise<SyncResult> {
  const started = Date.now();
  const community = await getCommunity();
  const supabase = getServiceClient();
  const { entries, raw } = await fetchPages();

  const cacheDir = resolve(process.cwd(), "data/raw");
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    resolve(cacheDir, `luma-${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
    JSON.stringify(raw),
    "utf8",
  );

  const now = new Date().toISOString();
  const { data: existingSource } = await supabase
    .from("sources")
    .select("id")
    .eq("community_id", community.id)
    .eq("type", "luma")
    .maybeSingle();

  let sourceId = existingSource?.id as string | undefined;
  if (!sourceId) {
    const { data: created, error } = await supabase
      .from("sources")
      .insert({
        community_id: community.id,
        type: "luma",
        name: "Luma London (public)",
        synced_at: now,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create Luma source");
    sourceId = created.id;
  } else {
    await supabase.from("sources").update({ synced_at: now }).eq("id", sourceId);
  }

  const { data: beforeRows } = await supabase
    .from("luma_events")
    .select("external_id")
    .eq("source_id", sourceId);
  const before = new Set((beforeRows ?? []).map((row) => String(row.external_id)));

  const rows = entries
    .map((entry) => {
      const event = entry.event;
      if (!event?.name) return null;
      const externalId = event.api_id || entry.api_id;
      if (!externalId) return null;
      const url = lumaPermalink(event.url ?? "");
      return {
        community_id: community.id,
        source_id: sourceId,
        external_id: externalId,
        title: event.name,
        starts_at: event.start_at ?? null,
        ends_at: event.end_at ?? null,
        host: hostName(entry),
        community: entry.calendar?.name ?? null,
        url,
        description: null as string | null,
        venue: event.geo_address_info?.address ?? event.geo_address_info?.city ?? null,
        guest_count: entry.guest_count ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    const { error } = await supabase
      .from("luma_events")
      .upsert(rows, { onConflict: "source_id,external_id" });
    if (error) throw new Error(error.message);
  }

  const inserted = rows.filter((row) => !before.has(row.external_id)).length;
  const updated = rows.length - inserted;

  return {
    read: rows.length,
    inserted,
    updated,
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
  };
}
