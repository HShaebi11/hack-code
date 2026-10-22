import { getCommunity, sourceLabel, whatsappPermalink } from "@/lib/community";
import { rememberContext } from "@/lib/cognee";
import { extractBrain } from "@/lib/extract";
import { parseWhatsAppExport } from "@/lib/parse-whatsapp";
import { getServiceClient } from "@/lib/supabase";
import type { ImportCounts, ParsedMessage, SourceType } from "@/lib/types";
import { assertNever } from "@/lib/types";

export type ImportResult = {
  sourceId: string;
  counts: ImportCounts;
  usedModel: boolean;
};

function parseBySource(sourceType: SourceType, text: string): ParsedMessage[] {
  switch (sourceType) {
    case "whatsapp":
    case "paste":
      return parseWhatsAppExport(text);
    case "discord":
    case "slack":
      throw new Error(`${sourceLabel(sourceType)} import is stubbed for this demo.`);
    default:
      return assertNever(sourceType);
  }
}

export async function importCorpus(input: {
  text: string;
  sourceType: SourceType;
  sourceName?: string;
}): Promise<ImportResult> {
  const messages = parseBySource(input.sourceType, input.text);
  if (messages.length === 0) {
    throw new Error("No usable messages found. Check this is a WhatsApp .txt export.");
  }

  const community = await getCommunity();
  const supabase = getServiceClient();
  const sourceName =
    input.sourceName?.trim() || `${sourceLabel(input.sourceType)} import`;

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      community_id: community.id,
      type: input.sourceType,
      name: sourceName,
      synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? "Could not create source");
  }

  const messageRows = messages.map((message) => ({
    source_id: source.id,
    message_id: message.messageId,
    author: message.author,
    body: message.body,
    sent_at: message.sentAt?.toISOString() ?? null,
    permalink: whatsappPermalink(source.id, message.line),
  }));

  const { error: messageError } = await supabase
    .from("messages")
    .upsert(messageRows, { onConflict: "source_id,message_id", ignoreDuplicates: true });

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { brain, usedModel } = await extractBrain(messages, input.sourceType);

  for (const person of brain.people) {
    const { data: existing } = await supabase
      .from("people")
      .select("id, note")
      .eq("community_id", community.id)
      .eq("name", person.name)
      .maybeSingle();

    if (existing) {
      if (!existing.note && person.note) {
        await supabase.from("people").update({ note: person.note }).eq("id", existing.id);
      }
    } else {
      await supabase.from("people").insert({
        community_id: community.id,
        name: person.name,
        note: person.note || null,
        first_seen: person.firstSeen?.toISOString() ?? null,
      });
    }
  }

  if (brain.ideas.length > 0) {
    const { error: ideaError } = await supabase.from("ideas").insert(
      brain.ideas.map((idea) => ({
        community_id: community.id,
        source_id: source.id,
        message_id: idea.messageId || null,
        title: idea.title,
        body: idea.body,
        author: idea.author,
        sent_at: idea.sentAt?.toISOString() ?? null,
        citation: idea.citation,
      })),
    );
    if (ideaError) throw new Error(ideaError.message);
  }

  if (brain.memories.length > 0) {
    const { error: memoryError } = await supabase.from("memories").insert(
      brain.memories.map((memory) => ({
        community_id: community.id,
        source_id: source.id,
        message_id: memory.messageId || null,
        body: memory.body,
        author: memory.author,
        sent_at: memory.sentAt?.toISOString() ?? null,
        citation: memory.citation,
      })),
    );
    if (memoryError) throw new Error(memoryError.message);
  }

  if (brain.expertise.length > 0) {
    const { data: peopleRows } = await supabase
      .from("people")
      .select("id, name")
      .eq("community_id", community.id);
    const byName = new Map(
      (peopleRows ?? []).map((row) => [String(row.name).toLowerCase(), String(row.id)]),
    );
    const expertiseRows = brain.expertise
      .map((row) => {
        const personId = byName.get(row.name.toLowerCase());
        if (!personId) return null;
        return {
          community_id: community.id,
          person_id: personId,
          topic: row.topic,
          evidence_message_ids: row.messageIds,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    if (expertiseRows.length > 0) {
      const { error: expertiseError } = await supabase
        .from("expertise")
        .upsert(expertiseRows, { onConflict: "community_id,person_id,topic" });
      if (expertiseError) throw new Error(expertiseError.message);
    }
  }

  await rememberContext(
    community.slug,
    [
      ...brain.ideas.map((idea) => `Idea: ${idea.title}. ${idea.body}`),
      ...brain.memories.map((memory) => memory.body),
      ...brain.people.map((person) => `${person.name}: ${person.note}`),
    ],
  );

  return {
    sourceId: source.id,
    usedModel,
    counts: {
      messages: messages.length,
      ideas: brain.ideas.length,
      people: brain.people.length,
      memories: brain.memories.length,
      expertise: brain.expertise.length,
    },
  };
}
