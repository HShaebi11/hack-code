import { NextResponse } from "next/server";
import { importCorpus } from "@/lib/import-corpus";
import { SOURCE_TYPES, type SourceType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function isSourceType(value: string): value is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const sourceTypeRaw = String(form.get("sourceType") ?? "whatsapp");
    if (!isSourceType(sourceTypeRaw)) {
      return NextResponse.json({ error: "Unknown source" }, { status: 400 });
    }
    if (sourceTypeRaw === "discord" || sourceTypeRaw === "slack") {
      return NextResponse.json(
        { error: `${sourceTypeRaw} sync is stubbed. Use a WhatsApp .txt for the demo.` },
        { status: 400 },
      );
    }

    const file = form.get("file");
    const pasted = String(form.get("text") ?? "");
    let text = pasted;
    if (file instanceof File) {
      text = await file.text();
    }
    if (!text.trim()) {
      return NextResponse.json({ error: "Upload a WhatsApp .txt or paste the export." }, { status: 400 });
    }

    const result = await importCorpus({
      text,
      sourceType: sourceTypeRaw,
      sourceName: file instanceof File ? file.name : "Pasted export",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
