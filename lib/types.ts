export const SOURCE_TYPES = ["whatsapp", "discord", "slack", "paste"] as const;
export const SOURCE_KINDS = [...SOURCE_TYPES, "luma"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceKind = (typeof SOURCE_KINDS)[number];

export type ParsedMessage = {
  messageId: string;
  author: string;
  body: string;
  sentAt: Date | null;
  line: number;
};

export type ExtractedIdea = {
  title: string;
  body: string;
  author: string;
  messageId: string;
  sentAt: Date | null;
  citation: string;
};

export type ExtractedPerson = {
  name: string;
  note: string;
  firstSeen: Date | null;
};

export type ExtractedMemory = {
  body: string;
  author: string;
  messageId: string;
  sentAt: Date | null;
  citation: string;
};

export type ExtractedExpertise = {
  name: string;
  topic: string;
  messageIds: string[];
};

export type ExtractedBrain = {
  ideas: ExtractedIdea[];
  people: ExtractedPerson[];
  memories: ExtractedMemory[];
  expertise: ExtractedExpertise[];
};

export type ImportCounts = {
  messages: number;
  ideas: number;
  people: number;
  memories: number;
  expertise: number;
};

export type SourceRow = {
  id: string;
  type: SourceKind;
  name: string;
  synced_at: string | null;
};

export type LumaEventRow = {
  id: string;
  title: string;
  starts_at: string | null;
  host: string | null;
  community: string | null;
  url: string;
  venue: string | null;
};

export type McpSource = {
  person: string;
  platform: string;
  ts: string;
  quote: string;
  permalink: string;
};

export type McpEnvelope = {
  summary: string;
  data: Record<string, unknown>;
  sources: McpSource[];
};

export type Community = {
  id: string;
  name: string;
  slug: string;
};

export type IdeaRow = {
  id: string;
  title: string;
  body: string;
  author: string | null;
  sent_at: string | null;
  citation: string;
  message_id: string | null;
  source_id: string | null;
};

export type PersonRow = {
  id: string;
  name: string;
  handle: string | null;
  note: string | null;
  first_seen: string | null;
};

export type MemoryRow = {
  id: string;
  body: string;
  author: string | null;
  citation: string;
  sent_at: string | null;
};

export type EventRow = {
  id: string;
  title: string;
  pitch: string;
  why_now: string;
  citations: unknown;
  status: string;
  idea_id: string | null;
  community_id: string;
};

export type EventPersonRow = {
  id: string;
  name: string;
  why: string;
  person_id: string | null;
};

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
