import { getServiceClient } from "@/lib/supabase";
import type { Community, SourceKind } from "@/lib/types";

const SLUG = "hack-code";

export async function getCommunity(): Promise<Community> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", SLUG)
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "Hack Code community is missing. Run the Supabase migration first.",
    );
  }

  return data;
}

export function formatCitation(sourceType: SourceKind, sentAt: Date | null): string {
  const when = sentAt
    ? sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "undated";
  return `${sourceLabel(sourceType)}, ${when}`;
}

export function sourceLabel(sourceType: SourceKind): string {
  switch (sourceType) {
    case "whatsapp":
      return "WhatsApp";
    case "discord":
      return "Discord";
    case "slack":
      return "Slack";
    case "paste":
      return "Paste";
    case "luma":
      return "Luma";
    default: {
      const _exhaustive: never = sourceType;
      return _exhaustive;
    }
  }
}

export function whatsappPermalink(sourceId: string, line: number): string {
  return `whatsapp://${sourceId}#L${line}`;
}

export function lumaPermalink(slugOrUrl: string): string {
  if (slugOrUrl.startsWith("http://") || slugOrUrl.startsWith("https://")) {
    return slugOrUrl;
  }
  return `https://lu.ma/${slugOrUrl.replace(/^\//, "")}`;
}
