import { syncLuma } from "../lib/sync-luma";

async function main() {
  const result = await syncLuma();
  console.log(
    `READ ${result.read} ITEMS · NEW ${result.inserted} · UPDATED ${result.updated} · ${result.seconds}s`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
