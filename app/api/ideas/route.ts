import { NextResponse } from "next/server";
import { listIdeas } from "@/lib/queries";

export async function GET() {
  try {
    const ideas = await listIdeas();
    return NextResponse.json({ ideas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list ideas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
