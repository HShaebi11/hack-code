import { getCommunity } from "@/lib/community";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import type { IdeaRow, PersonRow, SourceRow } from "@/lib/types";

export async function listIdeas(): Promise<IdeaRow[]> {
  if (!isSupabaseConfigured()) return [];
  const community = await getCommunity();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("ideas")
    .select("id, title, body, author, sent_at, citation, message_id, source_id")
    .eq("community_id", community.id)
    .order("sent_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as IdeaRow[];
}

export async function getIdea(id: string): Promise<IdeaRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("ideas")
    .select("id, title, body, author, sent_at, citation, message_id, source_id")
    .eq("id", id)
    .maybeSingle();
  return (data as IdeaRow | null) ?? null;
}

export async function listPeople(): Promise<PersonRow[]> {
  if (!isSupabaseConfigured()) return [];
  const community = await getCommunity();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, handle, note, first_seen")
    .eq("community_id", community.id)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonRow[];
}

export async function getOverviewCounts(): Promise<{
  messages: number;
  ideas: number;
  people: number;
  lumaEvents: number;
  configured: boolean;
  sources: SourceRow[];
}> {
  if (!isSupabaseConfigured()) {
    return {
      messages: 0,
      ideas: 0,
      people: 0,
      lumaEvents: 0,
      configured: false,
      sources: [],
    };
  }
  const community = await getCommunity();
  const supabase = getServiceClient();
  const [{ count: ideas }, { count: people }, { data: sources }, { count: lumaEvents }] =
    await Promise.all([
      supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id),
      supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id),
      supabase
        .from("sources")
        .select("id, type, name, synced_at")
        .eq("community_id", community.id)
        .order("synced_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("luma_events")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id),
    ]);

  const sourceRows = (sources ?? []) as SourceRow[];
  const sourceIds = sourceRows.map((row) => row.id);
  let messages = 0;
  if (sourceIds.length > 0) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("source_id", sourceIds);
    messages = count ?? 0;
  }

  return {
    messages,
    ideas: ideas ?? 0,
    people: people ?? 0,
    lumaEvents: lumaEvents ?? 0,
    configured: true,
    sources: sourceRows,
  };
}
