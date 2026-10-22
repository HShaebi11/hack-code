import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGrapevineServer } from "../lib/mcp-app";

async function main() {
  const server = createGrapevineServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
