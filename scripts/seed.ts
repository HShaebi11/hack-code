import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importCorpus } from "../lib/import-corpus";
import { syncLuma } from "../lib/sync-luma";

async function main() {
  const path = resolve(process.cwd(), "fixtures/hack-code-whatsapp.txt");
  const text = readFileSync(path, "utf8");
  const imported = await importCorpus({
    text,
    sourceType: "whatsapp",
    sourceName: "hack-code-whatsapp.txt (demo data)",
  });
  const luma = await syncLuma();
  console.log(JSON.stringify({ imported, luma }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
