# Iraq Compass Data Verification Dashboard

Internal dashboard for cleaning, verifying, and approving Iraqi business records.

## Architecture (current)

- **Frontend:** Vite + React in `src/`
- **Local full-stack runtime:** Express server in `server.ts` (serves API + Vite middleware in dev, serves `dist/` in production mode)
- **Cloudflare runtime:** Worker entry in `worker/agent-runtime.ts` (deployed with Wrangler)
- **Data providers:**
  - Firebase Auth + Firestore (browser)
  - Supabase (browser realtime + server admin flows)

> Frontend and Worker are deployable separately. Wrangler does **not** deploy the Vite frontend bundle.

## Environment setup

1. Copy examples:
   - `.env.example` → `.env` (local Node + Vite usage)
   - `.dev.vars.example` → `.dev.vars` (Wrangler local/dev/deploy usage)
2. Fill in real credentials; do not commit secrets.

## Local development

```bash
npm install
npm run dev
```

This starts `server.ts` on `http://localhost:3000` with Vite middleware attached.

## Production build (frontend)

```bash
npm run build
npm run start
```

- `npm run build` builds the Vite frontend to `dist/`.
- `npm run start` launches `server.ts` in production mode and serves `dist/`.

## Worker development/deployment

```bash
npm run worker:dev
npm run worker:deploy
```

Wrangler entrypoint is `worker/agent-runtime.ts` (configured in `wrangler.toml`).

## Validation commands

```bash
npm run typecheck
npm run lint
npm run build
```

## Notes

- Browser variables must use `VITE_` prefix.
- Server/Worker secrets must remain non-`VITE_`.
- Firebase initialization is singleton-based and env-driven (`src/firebase.ts`).
