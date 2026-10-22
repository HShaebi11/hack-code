import { NextResponse } from "next/server";
import { adminAuthorized } from "@/lib/admin";
import { syncLuma } from "@/lib/sync-luma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Need ADMIN_KEY" }, { status: 401 });
  }
  try {
    const result = await syncLuma();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
