import { generateText, Output } from "ai";
import { xai } from "@ai-sdk/xai";
import { z } from "zod";
import { getCommunity } from "@/lib/community";
import { recallContext } from "@/lib/cognee";
import { getServiceClient } from "@/lib/supabase";
import type { EventPersonRow, EventRow, IdeaRow, MemoryRow, PersonRow } from "@/lib/types";

const pageSchema = z.object({
  title: z.string(),
  pitch: z.string(),
  whyNow: z.string(),
  speakers: z.array(
    z.object({
      name: z.string(),
      why: z.string(),
    }),
  ),
  citations: z.array(z.string()),
});

function fallbackPage(idea: IdeaRow, people: PersonRow[], memories: MemoryRow[]) {
  const speakers = people
    .filter((person) => person.note)
    .slice(0, 5)
    .map((person) => ({
      name: person.name,
      why: person.note || "Active in this community thread.",
    }));
  const whyNow =
    memories[0]?.body ??
    "The community already asked for this in chat. Turning it into a dated event page keeps the lead from scrolling the archive.";
  return {
    title: idea.title.replace(/^we should\s+/i, "").replace(/^let'?s\s+/i, ""),
    pitch: idea.body.split("\n")[0].slice(0, 220),
    whyNow,
    speakers:
      speakers.length > 0
        ? speakers
        : people.slice(0, 4).map((person) => ({
            name: person.name,
            why: "Showed up in the imported thread.",
          })),
    citations: [idea.citation, ...memories.slice(0, 3).map((memory) => memory.citation)].filter(
      Boolean,
    ),
  };
}

export async function createEventPage(ideaId: string): Promise<{ id: string }> {
  const community = await getCommunity();
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("idea_id", ideaId)
    .maybeSingle();
  if (existing?.id) return { id: existing.id };

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, title, body, author, sent_at, citation, message_id, source_id")
    .eq("id", ideaId)
    .single();
  if (ideaError || !idea) {
    throw new Error(ideaError?.message ?? "Idea not found");
  }

  const typedIdea = idea as IdeaRow;

  const [{ data: people }, { data: memories }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, handle, note, first_seen")
      .eq("community_id", community.id)
      .order("name"),
    supabase
      .from("memories")
      .select("id, body, author, citation, sent_at")
      .eq("community_id", community.id)
      .limit(12),
  ]);

  const personRows = (people ?? []) as PersonRow[];
  const memoryRows = (memories ?? []) as MemoryRow[];
  const recalled = await recallContext(`${typedIdea.title}\n${typedIdea.body}`);
  const fallback = fallbackPage(typedIdea, personRows, memoryRows);

  let page = fallback;
  if (process.env.XAI_API_KEY) {
    try {
      const { output } = await generateText({
        model: xai("grok-4.7"),
        output: Output.object({ schema: pageSchema }),
        prompt: `Write an internal event brief for a community lead to send a speaker.
Ground every claim in the imported community data. Do not invent people.
Status will be "idea". Keep the tone practical.

Community: ${community.name}
Idea title: ${typedIdea.title}
Idea body: ${typedIdea.body}
Who said it: ${typedIdea.author ?? "unknown"}
Citation: ${typedIdea.citation}

People in the data:
${personRows.map((p) => `- ${p.name}: ${p.note ?? ""}`).join("\n")}

Memories:
${memoryRows.map((m) => `- ${m.body} (${m.citation})`).join("\n")}

Retrieved context:
${recalled || "(none)"}

Return title, one-line pitch, why this community / why now, 3-6 suggested speakers from the people list with why, and citations like "WhatsApp, 12 Oct".`,
      });
      if (output) {
        page = {
          title: output.title,
          pitch: output.pitch,
          whyNow: output.whyNow,
          speakers: output.speakers.filter((speaker) =>
            personRows.some((p) => p.name.toLowerCase() === speaker.name.toLowerCase()),
          ),
          citations: output.citations.length > 0 ? output.citations : fallback.citations,
        };
        if (page.speakers.length === 0) page.speakers = fallback.speakers;
      }
    } catch {
      page = fallback;
    }
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      community_id: community.id,
      idea_id: typedIdea.id,
      title: page.title,
      pitch: page.pitch,
      why_now: page.whyNow,
      citations: page.citations,
      status: "idea",
    })
    .select("id")
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Could not save event");
  }

  if (page.speakers.length > 0) {
    await supabase.from("event_people").insert(
      page.speakers.map((speaker) => {
        const person = personRows.find(
          (row) => row.name.toLowerCase() === speaker.name.toLowerCase(),
        );
        return {
          event_id: event.id,
          person_id: person?.id ?? null,
          name: speaker.name,
          why: speaker.why,
        };
      }),
    );
  }

  return { id: event.id };
}

export async function getEvent(id: string): Promise<{
  event: EventRow;
  people: EventPersonRow[];
  idea: IdeaRow | null;
} | null> {
  const supabase = getServiceClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, pitch, why_now, citations, status, idea_id, community_id")
    .eq("id", id)
    .maybeSingle();
  if (!event) return null;

  const [{ data: people }, ideaResult] = await Promise.all([
    supabase.from("event_people").select("id, name, why, person_id").eq("event_id", id),
    event.idea_id
      ? supabase
          .from("ideas")
          .select("id, title, body, author, sent_at, citation, message_id, source_id")
          .eq("id", event.idea_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    event: event as EventRow,
    people: (people ?? []) as EventPersonRow[],
    idea: (ideaResult.data as IdeaRow | null) ?? null,
  };
}
