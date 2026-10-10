@AGENTS.md

# Moom project notes

- README.md (Thai) has status, setup, and the "ต้องเตรียม" list of things still needed from the owner.
- Database schema lives only in `supabase/migrations/`. `src/lib/supabase/database.types.ts` is hand-written to match;
  regenerate with `npm run db:types` once `npm run db:start` works, then reconcile.
- `tests/db/migrations.test.ts` runs the migrations on PGlite with stub `auth`/`storage` schemas. Add a case there
  whenever RLS or constraints change.
- Money / cross-tenant writes go through `src/lib/domain/*` with the service-role client after an explicit ownership
  check. Streamer-owned tables are written with the user client so RLS applies. Keep it that way.
- New UI strings go in both `src/lib/i18n/dict/th.ts` and `en.ts`.
- Visual style: pixel frames via `.px-*` classes in `src/app/globals.css`; money amounts use `.font-num`.
  Avoid emoji icons and generic "AI-looking" gradients/cards.
- Checks: `npm test`, `npm run lint`, `npm run build`.
