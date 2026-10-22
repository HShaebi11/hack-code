import { NextResponse } from "next/server";
import { createEventPage } from "@/lib/generate-event";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const event = await createEventPage(id);
    return NextResponse.json({ url: `/events/${event.id}`, id: event.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build event page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
