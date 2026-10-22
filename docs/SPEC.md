# Grapevine: build spec (21:00 to 21:50)

**What:** the brain of a community. It gathers what members said (WhatsApp) and what the scene is doing (Luma London events), organises it in Postgres, and gives admins an MCP to ask it. Every answer links to its source.
**Who:** community admins only. Members never log in.
**Pitch:** "Your community's memory, for the people who run it. Ask it from any AI tool."
**Track:** Wildcard. Name the real community, show the problem, fix it live.

## Rules
- Every answer has sources: `{ person, platform, ts, quote, permalink }`. No source, no claim.
- Read-only. Nothing is sent, posted or published.
- `data/` and `.env*` are gitignored (no private member data in the repo). Any example file is labelled "demo data".
- Public GitHub repo with an MIT LICENSE and a README.

## Stack (the event's partner stack)
- **Supabase**: the Postgres database (connect Drizzle with the Session pooler string as `DATABASE_URL`). RLS is enabled on every table with `org_id`, and the server uses the service key. Supabase Auth for admins is "next".
- **Cognee**: the memory layer. After import, `remember` each message (text + author + time + permalink) into dataset `grapevine_<org>` using the hosted Cognee MCP/API, run once ahead of the demo, never live (it takes about a minute). `recall` calls Cognee first with a 3 s timeout, then falls back to Supabase full-text so the demo can't fail.
- **Cursor**: builds it, and is the first MCP client in the demo.
- **Grok Bot**: plans the build and research, and is the second MCP client if sign-in works (otherwise Claude).
- App: Next.js App Router + TypeScript, `mcp-handler` for `/api/mcp`. One org row. No other AI calls tonight (keyword topics only).
- Not used tonight: Zero, Notion (say "next": Notion as a source, Zero for sponsor and intro CRM).

## Build now (in order, stop at 21:30)
### 1. Tables (Drizzle on Supabase, all with org_id, RLS enabled)
- `orgs` (id, name)
- `sources` (id, org_id, kind 'whatsapp'|'luma', name, synced_at)
- `messages` (id, org_id, source_id, external_id, author, ts, text, permalink), unique (source_id, external_id)
- `people` (id, org_id, name), unique (org_id, name)
- `events` (id, org_id, external_id, title, starts_at, community, host, address, url), unique (org_id, external_id)
Seed one org with the real community name.

### 2. Luma sync: `npm run sync`
- GET `https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-QCcNk3HXowOR97j&pagination_limit=50`, then follow `pagination_cursor=<next_cursor>` while `has_more` (max 3 pages, 1 s apart).
- Map `entries[].event`: `api_id` to external_id, `name` to title, `start_at` to starts_at, `geo_address_info.address` to address, `https://lu.ma/` + `url` to url. Map `entries[].calendar.name` to community and `entries[].hosts[0].name` to host if present.
- Upsert, then print `READ N · NEW N · X.Xs` with real numbers. A second run should say `NEW 0`.

### 3. WhatsApp import: `npm run import -- data/chat.txt`
- iOS `[22/10/2026, 14:03:12] Name: text`, Android `22/10/2026, 14:03 - Name: text`. Lines with no timestamp continue the previous message. Skip system lines, `<Media omitted>`, and messages under 3 words.
- external_id = line number, permalink = `whatsapp://<source_id>#L<line>`.
- Upsert people and messages, then print counts.

### 4. MCP: `/api/mcp` (Streamable HTTP)
- Requires `Authorization: Bearer <ADMIN_KEY>`, otherwise 401. The org comes from the key, never from input.
- Every tool returns `{ summary, data, sources[] }` and is marked read-only.
- **who_knows(topic, limit=5):** Postgres full-text search (`to_tsvector('english', text) @@ plainto_tsquery(topic)`) over messages, grouped by author and ranked by match count. Returns `data.people[] = { name, matches }`, plus that person's top 2 messages as sources.
- **recall(question):** Cognee recall first (3 s timeout, dataset grapevine_<org>), mapping its hits back to messages by permalink; otherwise Supabase full-text. Top 8 matching messages plus top 5 matching Luma events (title search). Messages become sources with platform 'whatsapp'; events become sources with platform 'luma', person = host, permalink = url.
- Empty case: `summary: "No one has talked about <topic> yet"`, `data: {}`, `sources: []`.
- Add to `.cursor/mcp.json`: `{ "mcpServers": { "grapevine": { "url": "http://localhost:3000/api/mcp", "headers": { "Authorization": "Bearer ${env:ADMIN_KEY}" } } } }`

### 4b. Cognee ingest: `npm run remember`
- Sends each message to Cognee `remember` in dataset `grapevine_<org>`, in batches, then polls status and prints done or failed. Run it once before the demo. If it fails, skip it, because recall falls back to Supabase.

### 5. One page: `/`
- Shows the community name, counts (messages, people, events, last sync) and a "Sync now" button that runs step 2 and shows the `READ · NEW · s` line.
- Tagline: "Everything your community has said, in one place."

## Done when
1. `npm run sync` loads real Luma events, and the second run says NEW 0.
2. `npm run import` loads the real export with counts.
3. In Cursor chat, `who_knows("<real topic>")` returns names with message sources.
4. `recall("<real question>")` returns messages plus Luma event links.
5. A topic nobody mentioned returns "No one has talked about … yet".

## Ship (21:30 to 21:50)
README (what it is, how to run, env vars: DATABASE_URL (Supabase session pooler), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY, COGNEE_API_KEY), MIT LICENSE, `git push` to a public repo, record a backup video, submit.

## Cut (not tonight)
AI extraction, ideas/memories tables, event_brief, the brief page, Discord/Slack, Notion, Zero, auth beyond the admin key. Say "next" in the demo.
