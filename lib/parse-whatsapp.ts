import { createHash } from "node:crypto";
import type { ParsedMessage } from "@/lib/types";

const BRACKET =
  /^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\]\s+([^:]+):\s([\s\S]*)$/i;
const DASH =
  /^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\s+-\s+([^:]+):\s([\s\S]*)$/i;

const SKIP_BODY =
  /^(<media omitted>|<attached:|omitted|this message was deleted|you deleted this message|sticker omitted|gif omitted|image omitted|video omitted|audio omitted|document omitted|\u200e.*)$/i;

const SKIP_AUTHOR = /^(system|whatsapp)$/i;

const NOISE = new Set([
  "ok",
  "okay",
  "k",
  "kk",
  "lol",
  "lmao",
  "haha",
  "hahaha",
  "yes",
  "yep",
  "yeah",
  "no",
  "nah",
  "thanks",
  "ty",
  "thx",
  "+",
  "++",
  "same",
  "this",
  "nice",
  "cool",
  "🔥",
  "😂",
  "❤️",
]);

function parseStamp(datePart: string, timePart: string): Date | null {
  const d = datePart.replace(/\./g, "/").split("/");
  if (d.length !== 3) return null;
  const [a, b, c] = d;
  const year = c.length === 2 ? 2000 + Number(c) : Number(c);
  const first = Number(a);
  const second = Number(b);
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : first;
  const time = timePart.trim().toLowerCase();
  const ampm = time.includes("pm") ? "pm" : time.includes("am") ? "am" : "";
  const clock = time.replace(/\s*[ap]m/i, "");
  const [hhRaw, mmRaw, ssRaw] = clock.split(":");
  let hours = Number(hhRaw);
  const minutes = Number(mmRaw ?? 0);
  const seconds = Number(ssRaw ?? 0);
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  const iso = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function messageId(author: string, body: string, sentAt: Date | null): string {
  const stamp = sentAt ? sentAt.toISOString() : "undated";
  return createHash("sha1")
    .update(`${stamp}|${author}|${body}`)
    .digest("hex")
    .slice(0, 16);
}

function isNoise(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < 8) return true;
  if (SKIP_BODY.test(trimmed)) return true;
  if (NOISE.has(trimmed.toLowerCase())) return true;
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(trimmed)) {
    return true;
  }
  return false;
}

export function parseWhatsAppExport(raw: string): ParsedMessage[] {
  const normalised = raw.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalised.split("\n");
  const chunks: { text: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (BRACKET.test(line) || DASH.test(line)) {
      chunks.push({ text: line, line: i + 1 });
    } else if (chunks.length > 0) {
      chunks[chunks.length - 1].text += `\n${line}`;
    }
  }

  const out: ParsedMessage[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const match = chunk.text.match(BRACKET) ?? chunk.text.match(DASH);
    if (!match) continue;
    const [, datePart, timePart, authorRaw, bodyRaw] = match;
    const author = authorRaw.replace(/\u200e/g, "").trim();
    const body = bodyRaw.replace(/\u200e/g, "").trim();
    if (!author || SKIP_AUTHOR.test(author)) continue;
    if (isNoise(body)) continue;
    const sentAt = parseStamp(datePart, timePart);
    const id = messageId(author, body, sentAt);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ messageId: id, author, body, sentAt, line: chunk.line });
  }

  return out;
}
