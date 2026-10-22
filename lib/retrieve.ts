import { recallContext } from "@/lib/cognee";
import { getCommunity, sourceLabel } from "@/lib/community";
import { getServiceClient } from "@/lib/supabase";
import type { McpEnvelope, McpSource, SourceKind } from "@/lib/types";

function emptyEnvelope(topic: string): McpEnvelope {
  return {
    summary: `No one has talked about ${topic} yet`,
    data: {},
    sources: [],
  };
}

function asKind(value: string | null | undefined): SourceKind {
  if (value === "discord" || value === "slack" || value === "paste" || value === "luma") {
    return value;
  }
  return "whatsapp";
}

function stamp(value: string | null | undefined): string {
  if (!value) return "undated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "undated";
  return date.toISOString();
}

type MessageHit = {
  message_id: string;
  author: string;
  body: string;
  sent_at: string | null;
  permalink: string | null;
  source_id: string;
};

async function communitySourceIds(communityId: string): Promise<string[]> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("sources").select("id, type").eq("community_id", communityId);
  return (data ?? []).map((row) => String(row.id));
}

async function sourceKindMap(communityId: string): Promise<Map<string, SourceKind>> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("sources").select("id, type").eq("community_id", communityId);
  return new Map((data ?? []).map((row) => [String(row.id), asKind(String(row.type))]));
}

function toSource(
  hit: MessageHit,
  kinds: Map<string, SourceKind>,
): McpSource {
  return {
    person: hit.author,
    platform: sourceLabel(kinds.get(hit.source_id) ?? "whatsapp"),
    ts: stamp(hit.sent_at),
    quote: hit.body.slice(0, 280),
    permalink: hit.permalink || `whatsapp://${hit.source_id}`,
  };
}

export async function whoKnows(topic: string, limit = 5): Promise<McpEnvelope> {
  const q = topic.trim();
  if (!q) return emptyEnvelope("that");
  const community = await getCommunity();
  const supabase = getServiceClient();
  const sourceIds = await communitySourceIds(community.id);
  const kinds = await sourceKindMap(community.id);
  if (sourceIds.length === 0) return emptyEnvelope(q);

  const needle = `%${q.replace(/[%*,()]/g, "").slice(0, 80)}%`;
  const { data: messages } = await supabase
    .from("messages")
    .select("message_id, author, body, sent_at, permalink, source_id")
    .in("source_id", sourceIds)
    .ilike("body", needle)
    .limit(40);

  const hits = (messages ?? []) as MessageHit[];
  const { data: expertiseRows } = await supabase
    .from("expertise")
    .select("person_id, topic, evidence_message_ids, people(name)")
    .eq("community_id", community.id)
    .ilike("topic", needle);

  type Ranked = {
    name: string;
    reason: string;
    evidence_count: number;
    sources: McpSource[];
  };
  const ranked = new Map<string, Ranked>();

  for (const hit of hits) {
    const key = hit.author.toLowerCase();
    const source = toSource(hit, kinds);
    const existing = ranked.get(key);
    if (existing) {
      existing.evidence_count += 1;
      existing.sources.push(source);
    } else {
      ranked.set(key, {
        name: hit.author,
        reason: `Talked about ${q} in ${source.platform}`,
        evidence_count: 1,
        sources: [source],
      });
    }
  }

  for (const row of expertiseRows ?? []) {
    const people = row.people as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(people) ? people[0]?.name : people?.name;
    if (!name) continue;
    const key = name.toLowerCase();
    const extra = Array.isArray(row.evidence_message_ids) ? row.evidence_message_ids.length : 0;
    const existing = ranked.get(key);
    if (existing) {
      existing.evidence_count += extra || 1;
      existing.reason = `Known for ${String(row.topic)} — and mentioned ${q}`;
    } else {
      ranked.set(key, {
        name,
        reason: `Tagged for ${String(row.topic)} from the Hack Code chat`,
        evidence_count: extra || 1,
        sources: [],
      });
    }
  }

  const people = [...ranked.values()]
    .sort((a, b) => b.evidence_count - a.evidence_count)
    .slice(0, limit);

  const sources = people.flatMap((person) => person.sources).slice(0, 8);
  if (people.length === 0 || sources.length === 0) {
    return emptyEnvelope(q);
  }

  const names = people.map((person) => person.name).join(", ");
  return {
    summary: `${names} ${people.length === 1 ? "knows" : "know"} ${q} — from what they said in Hack Code.`,
    data: {
      people: people.map((person) => ({
        name: person.name,
        reason: person.reason,
        evidence_count: person.evidence_count,
      })),
    },
    sources,
  };
}

export async function recall(question: string): Promise<McpEnvelope> {
  const q = question.trim();
  if (!q) return emptyEnvelope("that");
  const community = await getCommunity();
  const supabase = getServiceClient();
  const sourceIds = await communitySourceIds(community.id);
  const kinds = await sourceKindMap(community.id);
  const needle = `%${q.replace(/[%*,()]/g, "").slice(0, 80)}%`;
  const sources: McpSource[] = [];
  const ideas: { title: string; author: string | null }[] = [];
  const events: { title: string; url: string }[] = [];

  if (sourceIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("message_id, author, body, sent_at, permalink, source_id")
      .in("source_id", sourceIds)
      .ilike("body", needle)
      .limit(8);
    for (const hit of (messages ?? []) as MessageHit[]) {
      sources.push(toSource(hit, kinds));
    }
  }

  const { data: ideaRows } = await supabase
    .from("ideas")
    .select("title, author, body, sent_at, citation")
    .eq("community_id", community.id)
    .or(`title.ilike.${needle},body.ilike.${needle}`)
    .limit(5);
  for (const idea of ideaRows ?? []) {
    ideas.push({ title: String(idea.title), author: (idea.author as string | null) ?? null });
    sources.push({
      person: (idea.author as string | null) ?? "Unknown",
      platform: "WhatsApp",
      ts: stamp(idea.sent_at as string | null),
      quote: String(idea.body).slice(0, 280),
      permalink: String(idea.citation),
    });
  }

  const { data: lumaRows } = await supabase
    .from("luma_events")
    .select("title, url, host, starts_at, venue")
    .eq("community_id", community.id)
    .or(`title.ilike.${needle},venue.ilike.${needle},host.ilike.${needle}`)
    .limit(5);
  for (const event of lumaRows ?? []) {
    events.push({ title: String(event.title), url: String(event.url) });
    sources.push({
      person: (event.host as string | null) ?? "Luma",
      platform: "Luma",
      ts: stamp(event.starts_at as string | null),
      quote: String(event.title),
      permalink: String(event.url),
    });
  }

  const cognee = await recallContext(q);
  const unique = sources.slice(0, 8);
  if (unique.length === 0 && !cognee) {
    return emptyEnvelope(q);
  }
  if (unique.length === 0) {
    return emptyEnvelope(q);
  }

  return {
    summary: `Found ${unique.length} sourced hits in Hack Code for “${q}”.`,
    data: {
      ideas,
      luma_events: events,
      cognee: cognee || undefined,
    },
    sources: unique,
  };
}
