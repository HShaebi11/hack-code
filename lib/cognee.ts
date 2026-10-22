/**
 * Best-effort Cognee recall. SQL is the source of truth; this never blocks
 * import or event generation.
 */

let warmed: unknown = null;

async function getClient(): Promise<{
  remember: (input: { type: "text"; text: string }, dataset: string) => Promise<unknown>;
  recall: (query: string) => Promise<{ searchResponse?: { result?: { data?: unknown } } }>;
} | null> {
  const key = process.env.OPENAI_TOKEN ?? process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const spec = "@cognee/cognee-ts";
    const mod = (await import(/* webpackIgnore: true */ spec)) as {
      init?: () => void;
      Cognee: new (opts: { llmModel: string; llmApiKey: string }) => {
        warm: Promise<unknown>;
        remember: (input: { type: "text"; text: string }, dataset: string) => Promise<unknown>;
        recall: (query: string) => Promise<{ searchResponse?: { result?: { data?: unknown } } }>;
      };
    };
    if (typeof mod.init === "function") mod.init();
    const client = new mod.Cognee({
      llmModel: process.env.COGNEE_LLM_MODEL ?? "gpt-4o-mini",
      llmApiKey: key,
    });
    if (!warmed) {
      warmed = client.warm;
      await warmed;
    }
    return client;
  } catch {
    return null;
  }
}

export async function rememberContext(
  dataset: string,
  texts: string[],
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    const blob = texts.filter(Boolean).slice(0, 40).join("\n\n");
    if (!blob) return;
    await client.remember({ type: "text", text: blob }, dataset);
  } catch {
    // Demo must not fail because memory ingest is slow or unconfigured.
  }
}

export async function recallContext(query: string): Promise<string> {
  const client = await getClient();
  if (!client) return "";
  try {
    const result = await client.recall(query);
    const data = result.searchResponse?.result?.data;
    if (typeof data === "string") return data;
    if (data) return JSON.stringify(data).slice(0, 4000);
    return "";
  } catch {
    return "";
  }
}
