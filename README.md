# Grapevine

Everything **Hack Code** has said, in one place. Import a WhatsApp export, sync public Luma London, then ask any AI tool over MCP who knows what — every answer carries the source.

Members never sign in. The lead (in the room tonight) is the only operator.

## What hurts today

Hack Code’s memory lives in the group chat. Admins plan events blind and cannot find who knows evals, venues, or beginners without scrolling WhatsApp and asking around.

## Setup (another community, next week)

1. Fork this MIT repo. Create a [Supabase](https://supabase.com) project.
2. Run both files in [`supabase/migrations/`](supabase/migrations/) in the SQL editor.
3. Copy `.env.example` to `.env.local`. Fill URL, service role, and optional `XAI_API_KEY` (Grok). Optional `OPENAI_TOKEN` for Cognee. Set `ADMIN_KEY` so only you can sync and query.
4. Change the community name/slug in [`lib/community.ts`](lib/community.ts) and the seed row in the first migration — or insert your own `communities` row.
5. `npm install && npm run dev`

Do not commit private chats. `data/` and `.env*` are gitignored. Only public Luma JSON may be cached locally.

## Demo

1. Open `/`. Brain should look empty.
2. Import your WhatsApp `.txt` (iOS `[dd/mm/yyyy, hh:mm:ss] Name: text` or Android `dd/mm/yyyy, hh:mm - Name: text`). The bundled [`fixtures/hack-code-whatsapp.txt`](fixtures/hack-code-whatsapp.txt) is **demo data**.
3. Click **Sync now** (or `npm run sync`) for Luma London. A second run should print `NEW 0`.
4. Point Cursor at `http://127.0.0.1:3000/api/mcp` (see [`.cursor/mcp.json`](.cursor/mcp.json)).
5. Ask `who_knows("evals")`. Click a source. Then ask something nobody said and get `No one has talked about … yet`.

Stdio fallback: `npm run mcp`.

## Partners used

- Supabase — store
- Grok — extract (keyword fallback if the key is missing)
- Cognee — optional memory; SQL is the source of truth
- Cursor — HTTP MCP

WhatsApp is a lead-owned `.txt` export. We do not use unofficial WhatsApp clients.

## Licence

MIT. See [LICENSE](LICENSE).
