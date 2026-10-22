import { generateText, Output } from "ai";
import { xai } from "@ai-sdk/xai";
import { z } from "zod";
import { formatCitation, sourceLabel } from "@/lib/community";
import type {
  ExtractedBrain,
  ExtractedExpertise,
  ExtractedIdea,
  ExtractedMemory,
  ExtractedPerson,
  ParsedMessage,
  SourceType,
} from "@/lib/types";

const TOPIC_HINTS: { topic: string; re: RegExp }[] = [
  { topic: "evals", re: /\b(evals?|prompts?|fine-tun|grok)\b/i },
  { topic: "backend", re: /\b(postgres|backend|webhook|auth|supabase)\b/i },
  { topic: "beginners", re: /\b(beginners?|new to|first time|lost)\b/i },
  { topic: "venues", re: /\b(venue|lockbox|room|bar near)\b/i },
  { topic: "sponsors", re: /\b(sponsors?|partnerships|payments company)\b/i },
  { topic: "design", re: /\b(design|landing page)\b/i },
];

export function extractExpertise(messages: ParsedMessage[]): ExtractedExpertise[] {
  const byKey = new Map<string, ExtractedExpertise>();
  for (const message of messages) {
    for (const hint of TOPIC_HINTS) {
      if (!hint.re.test(message.body)) continue;
      const key = `${message.author.toLowerCase()}|${hint.topic}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.messageIds.includes(message.messageId)) {
          existing.messageIds.push(message.messageId);
        }
      } else {
        byKey.set(key, {
          name: message.author,
          topic: hint.topic,
          messageIds: [message.messageId],
        });
      }
    }
  }
  return [...byKey.values()];
}

const extractSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      author: z.string(),
      messageId: z.string(),
    }),
  ),
  people: z.array(
    z.object({
      name: z.string(),
      note: z.string(),
    }),
  ),
  memories: z.array(
    z.object({
      body: z.string(),
      author: z.string(),
      messageId: z.string(),
    }),
  ),
});

const IDEA_HINT =
  /\b(should|let'?s|we could|we can|idea|event|meetup|workshop|track|night|demo|beginner|office hours|hack|talk|ama|breakfast|sunday|sponsor)\b/i;

function indexMessages(messages: ParsedMessage[]): Map<string, ParsedMessage> {
  return new Map(messages.map((message) => [message.messageId, message]));
}

function hydrate(
  extracted: z.infer<typeof extractSchema>,
  messages: ParsedMessage[],
  sourceType: SourceType,
): ExtractedBrain {
  const byId = indexMessages(messages);
  const ideas: ExtractedIdea[] = [];
  const seenTitles = new Set<string>();

  for (const idea of extracted.ideas) {
    const key = idea.title.trim().toLowerCase();
    if (!key || seenTitles.has(key)) continue;
    seenTitles.add(key);
    const source = byId.get(idea.messageId) ?? messages.find((m) => m.author === idea.author);
    const sentAt = source?.sentAt ?? null;
    ideas.push({
      title: idea.title.trim(),
      body: idea.body.trim() || source?.body || idea.title,
      author: idea.author.trim() || source?.author || "Unknown",
      messageId: idea.messageId || source?.messageId || "",
      sentAt,
      citation: formatCitation(sourceType, sentAt),
    });
  }

  const peopleMap = new Map<string, ExtractedPerson>();
  for (const person of extracted.people) {
    const name = person.name.trim();
    if (!name) continue;
    const first = messages.find((m) => m.author.toLowerCase() === name.toLowerCase());
    peopleMap.set(name.toLowerCase(), {
      name,
      note: person.note.trim(),
      firstSeen: first?.sentAt ?? null,
    });
  }

  const memories: ExtractedMemory[] = [];
  for (const memory of extracted.memories) {
    const source = byId.get(memory.messageId);
    const sentAt = source?.sentAt ?? null;
    memories.push({
      body: memory.body.trim(),
      author: memory.author.trim() || source?.author || "Unknown",
      messageId: memory.messageId || source?.messageId || "",
      sentAt,
      citation: formatCitation(sourceType, sentAt),
    });
  }

  return {
    ideas,
    people: [...peopleMap.values()],
    memories,
    expertise: extractExpertise(messages),
  };
}

export function extractHeuristic(
  messages: ParsedMessage[],
  sourceType: SourceType,
): ExtractedBrain {
  const ideas: ExtractedIdea[] = [];
  const peopleMap = new Map<string, ExtractedPerson>();
  const memories: ExtractedMemory[] = [];

  for (const message of messages) {
    const existing = peopleMap.get(message.author.toLowerCase());
    const offer = /\b(i can|i'll|i will|happy to|i run|i teach|i've built|i built)\b/i.test(
      message.body,
    );
    const note = offer ? message.body.slice(0, 180) : existing?.note ?? "";
    peopleMap.set(message.author.toLowerCase(), {
      name: message.author,
      note,
      firstSeen: existing?.firstSeen ?? message.sentAt,
    });

    if (IDEA_HINT.test(message.body) && message.body.length > 40) {
      const title = message.body.split(/[.!\n]/)[0].slice(0, 90).trim();
      ideas.push({
        title,
        body: message.body,
        author: message.author,
        messageId: message.messageId,
        sentAt: message.sentAt,
        citation: formatCitation(sourceType, message.sentAt),
      });
    }

    if (
      /\b(we are|community|every|usually|this group|hack code)\b/i.test(message.body) &&
      message.body.length > 50
    ) {
      memories.push({
        body: message.body.slice(0, 280),
        author: message.author,
        messageId: message.messageId,
        sentAt: message.sentAt,
        citation: formatCitation(sourceType, message.sentAt),
      });
    }
  }

  const deduped: ExtractedIdea[] = [];
  const seen = new Set<string>();
  for (const idea of ideas) {
    const key = idea.title.toLowerCase().replace(/\s+/g, " ").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(idea);
  }

  return {
    ideas: deduped.slice(0, 24),
    people: [...peopleMap.values()],
    memories: memories.slice(0, 20),
    expertise: extractExpertise(messages),
  };
}

export async function extractBrain(
  messages: ParsedMessage[],
  sourceType: SourceType,
): Promise<{ brain: ExtractedBrain; usedModel: boolean }> {
  const heuristic = extractHeuristic(messages, sourceType);
  if (!process.env.XAI_API_KEY) {
    return { brain: heuristic, usedModel: false };
  }

  const sample = messages
    .slice(0, 180)
    .map(
      (m) =>
        `[id=${m.messageId} | ${m.author} | ${m.sentAt?.toISOString() ?? "undated"}] ${m.body}`,
    )
    .join("\n");

  try {
    const { output } = await generateText({
      model: xai("grok-4.7"),
      output: Output.object({ schema: extractSchema }),
      prompt: `You organise a community chat into artefacts for a community lead.
Source: ${sourceLabel(sourceType)}.
Skip jokes, gifs, and acknowledgements.

Return:
- ideas: concrete event/programme proposals a lead could pick (one-line title + original snippet). Use the real messageId and author.
- people: named humans in the chat, with a short note on how they could help (skill, offer, role).
- memories: short facts about the community (cadence, audience, constraints).

Chat:
${sample}`,
    });

    if (!output) return { brain: heuristic, usedModel: false };
    const hydrated = hydrate(output, messages, sourceType);
    if (hydrated.ideas.length === 0) {
      return { brain: heuristic, usedModel: true };
    }
    if (hydrated.people.length === 0) {
      hydrated.people = heuristic.people;
    }
    return { brain: hydrated, usedModel: true };
  } catch {
    return { brain: heuristic, usedModel: false };
  }
}
