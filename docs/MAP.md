# Grapevine map

Hack Code lead UI: import a WhatsApp export, sync Luma London, ask the MCP who knows what.

## Where new things go

- Screens: `app/page.tsx` (import + sync), `app/ideas/`, `app/events/[id]/`
- APIs: `app/api/import`, `app/api/sync`, `app/api/mcp`, `app/api/ideas`, `app/api/ideas/[id]/event`
- Data + extract/generate/retrieve: `lib/` — never fetch Supabase from a component
- Schema: `supabase/migrations/`
- Sample corpus (demo data): `fixtures/hack-code-whatsapp.txt` (copied to `public/` for download)
- MCP: `app/api/mcp/route.ts` (HTTP) and `mcp/server.ts` (stdio), tools in `lib/mcp-app.ts`
- Luma: `lib/sync-luma.ts`, `scripts/sync.ts`, cache under `data/raw/` (gitignored)

## Stack

Next.js App Router, Supabase (service role on the server), Grok (`XAI_API_KEY`), Cognee best-effort with SQL fallback.
