import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { recall, whoKnows } from "@/lib/retrieve";
import type { McpEnvelope } from "@/lib/types";

function asText(envelope: McpEnvelope) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(envelope, null, 2) }],
  };
}

export function createGrapevineServer(): McpServer {
  const server = new McpServer({
    name: "grapevine",
    version: "0.1.0",
  });

  server.registerTool(
    "who_knows",
    {
      description:
        "Who in Hack Code knows about a topic, with quotes and permalinks from the imported chat. Never guesses.",
      inputSchema: {
        topic: z.string().describe("Skill or topic, e.g. evals"),
        limit: z.number().optional().describe("Max people, default 5"),
      },
    },
    async ({ topic, limit }) => asText(await whoKnows(topic, limit ?? 5)),
  );

  server.registerTool(
    "recall",
    {
      description:
        "Search Hack Code ideas, chat, and synced Luma London events. Every hit includes a source.",
      inputSchema: {
        question: z.string().describe("What to look up in the community brain"),
      },
    },
    async ({ question }) => asText(await recall(question)),
  );

  return server;
}
