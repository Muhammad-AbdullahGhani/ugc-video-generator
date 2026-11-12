# Remediation — ReelForge UGC Video Generator

Companion to [PRODUCTION-READINESS-REPORT.md](PRODUCTION-READINESS-REPORT.md). All 22 findings are fixed, plus one more (#23) found while verifying them.

**Verification run on 2026-11-11:**

```
npx eslint        ✓ clean
npx tsc --noEmit  ✓ clean
npx vitest run    ✓ 52 tests passing (5 files)
npx next build    ✓ 8 routes, no warnings
```

Plus a live smoke test against a dev server: SSRF vectors rejected, anonymous renders refused, rate limiting tripping at the configured budget, signed video URLs serving with correct 206/416 handling, and a real end-to-end render producing a verified 7s 720×1280 MP4 with audio.

---

## New modules

The fixes are concentrated in small, single-purpose modules rather than scattered through the routes:

| Module | Purpose |
|---|---|
| `lib/env.ts` | The only place `process.env` is read. Validates at import, fails the boot rather than defaulting. |
| `lib/errors.ts` | `AppError` + error-code taxonomy; the only path by which an error may leave the server. |
| `lib/logger.ts` | Structured logging, redaction of secret-shaped fields, request ids. |
| `lib/safe-fetch.ts` | SSRF-resistant outbound fetch: scheme allowlist, DNS + private-range checks, manual redirects, byte caps. |
| `lib/rate-limit.ts` | Token-bucket limiter, per-identity budgets. |
| `lib/concurrency.ts` | `Semaphore` (render ceiling) and `Mutex` (store writes). |
| `lib/validators.ts` | Content checks for values crossing a trust boundary — hex colours, hook text, filenames, Range headers. |
| `lib/signed-url.ts` | HMAC-signed, expiring URLs for locally served renders. |
| `lib/render-paths.ts` | Render directory resolution and TTL sweeps. |
| `lib/ffmpeg-binaries.ts` | FFmpeg/ffprobe resolution, separated so a health check needn't import the pipeline. |
| `instrumentation.ts` | Boot-time configuration gate and readiness logging. |

---

## P0

### 1. Hardcoded fallback session secret — fixed

`auth.ts` now takes its secret from `env.auth.secret`, and `lib/env.ts:74` throws when `AUTH_SECRET` is absent. There is no fallback outside the test environment.

Production-only requirements moved to `assertProductionConfig()`, called from `instrumentation.ts` at server start. `next build` runs with `NODE_ENV=production` but no secrets; gating on `NEXT_PHASE` keeps the build working without weakening the runtime check.

> **Action for you:** the old secret is in git history. Treat it as burned and generate a new one.

### 2. Open `demo-guest` provider — fixed

The provider is only registered when `ENABLE_DEMO_GUEST=true`, and `lib/env.ts:101` forces it off whenever `NODE_ENV=production` regardless of the flag. Guests now get `guest_<uuid>` with an email in the reserved `.invalid` namespace, so a guest identity can never collide with or impersonate a real account. `/api/auth/config` reports `guestEnabled`, and both sign-in components hide the button unless the server offers it.

### 3. Unauthenticated, unmetered pipeline — fixed

`app/api/chat/route.ts` now requires a session before any render path (`UNAUTHORIZED` otherwise), rate limits chat per identity and renders per user, and validates/bounds `message` and `history` before doing any work. Anonymous callers keep a quarter of the chat budget and get no renders.

*Verified:* anonymous render → `401 UNAUTHORIZED`; 5 000-character message → `400 INVALID_REQUEST`; eleventh render in an hour → `RATE_LIMITED`.

### 4. SSRF — fixed

Every fetch of a user-supplied URL goes through `lib/safe-fetch.ts`: http/https only, no embedded credentials, DNS resolved with **every** returned address checked against loopback/private/link-local/CGNAT/benchmark/multicast ranges (v4 and v6, including IPv4-mapped), redirects followed manually with the host re-validated per hop, hard timeouts, and bodies truncated at a byte ceiling instead of buffered whole.

*Verified:* `169.254.169.254`, `127.0.0.1`, and `192.168.1.1` all rejected with `URL_NOT_ALLOWED`, plus 16 unit tests over the address classifier.

### 5. Anonymous public file host — fixed

The catbox.moe branch is deleted. `lib/storage.ts` uploads to Vercel Blob (streamed, not buffered) and fails loudly if that fails; in development it returns an HMAC-signed local URL. `BLOB_READ_WRITE_TOKEN` is a required production variable, checked at boot.

---

## P1

### 6. Unstable ids / dual-key ownership — fixed

Guest ids are `guest_<uuid>`, stable for the session. `currentUserId()` in `auth.ts` is the single identity source and returns the provider subject only — never the email. `lib/user-videos.ts` filters on `userId` alone; the `|| userEmail === ...` branch is gone from both read and delete.

### 7. JSON store — improved, with one honest limit

Writes are serialized through a `Mutex` and committed atomically (temp file + rename), so concurrent saves can no longer interleave or truncate. Reads and writes are async, records are bounded per user (200) and globally (5 000), and `DATA_DIR` can point at a persistent volume.

> **Remaining limitation, by design:** on serverless this is still per-instance ephemeral disk. `assertDurableStore()` logs a warning at boot, the README documents it, and `lib/user-videos.ts` is structured so three functions swap for a database client. Making it genuinely durable needs infrastructure, not code.

### 8. Fabricated verification — fixed

`@ffprobe-installer/ffprobe` is now a dependency, resolved the same way FFmpeg is. `validateRender()` measures duration, dimensions and audio from a single JSON probe via `execFile` (args array, no shell). When ffprobe cannot run, it returns `verified: false` with `null` fields, and the UI step says *"Quality Verification Skipped"* instead of printing a checkmark. `hasAudio` is measured, not assumed. The automatic retry now fires only on a *measured* failure.

*Verified by integration test:* a generated 7s clip reports 480×854 with audio; the same clip without an audio stream reports `hasAudio: false` and `valid: false`; an unparseable file reports `verified: false` with nulls rather than plausible numbers.

### 9. Filter-graph injection — fixed

`normalizeHexColor()` enforces `/^[0-9a-fA-F]{6}$/` (expanding `#abc`, dropping alpha, falling back on near-black). Applied to the model's `brand_color` and to the scraped `theme-color`.

*Verified:* an end-to-end render with `brandColor: 'aa;bb;'` succeeded using the fallback colour instead of corrupting the graph.

### 10. FFmpeg lifecycle — fixed

`spawn` now carries `{ timeout, killSignal: 'SIGKILL' }`; the request's `AbortSignal` kills the process when the client disconnects; `stderr` is capped at its last 8 KB; a `Semaphore` caps concurrent encodes (default 2) and rejects with `RENDER_BUSY` past a bounded queue. The SSE stream implements `cancel()`, and the client sends an `AbortController` signal and aborts on unmount.

### 11. Leaked internals — fixed

Every failure becomes an `AppError` with a stable code and a user-written message. Raw messages — FFmpeg stderr, SDK errors, raw model output — are logged against a request id and never serialized. Responses carry `{ code, message, requestId, retryable }` and an `X-Request-Id` header.

### 12. Range handling — fixed

`parseRangeHeader()` handles closed, open-ended and suffix ranges, clamps the end, and returns `'unsatisfiable'` for garbage — answered with `416` and `Content-Range: bytes */size`. The hand-rolled stream bridge is replaced with `Readable.toWeb()` so backpressure works. The route also now requires a valid HMAC signature and only accepts filenames matching the render pattern.

*Verified:* `200` full, `206` with correct `Content-Range`, `416` for `bytes=abc-` and for out-of-bounds, `404` for a tampered signature, `400` for a traversal attempt.

### 13. Prompt injection — mitigated, output validated

Scraped content sits in a labelled `UNTRUSTED_PAGE_CONTENT` block with an explicit data-not-instructions directive in both the prompt and the system instruction. More importantly, every returned field is validated: `category` against the enum, `brand_color` against the hex regex, `hook_text` and `summary` sanitized and length-capped, `gif_search_term` still constrained to the mood pool. Generation calls have a timeout, and model fallbacks back off exponentially.

### 14. Rate limiting — added

Token-bucket limiter with per-identity budgets: chat per minute, renders per hour, a tighter anonymous budget. Configurable via env. Single-instance by design — the module documents the Redis swap for horizontal scaling, and no call site changes.

### 15. Tests and CI — added

`npm run verify` (lint + typecheck + test) and `.github/workflows/ci.yml` running install → lint → typecheck → test → build on every push, plus a gitleaks job. 50 tests cover the validators, the SSRF address classifier, the limiter, the semaphore and mutex, signed URLs, and the render validator against real FFmpeg output.

---

## P2

| # | Finding | Fix |
|---|---|---|
| 16 | Base64 data-URI fallback | Removed with the catbox branch; uploads stream rather than buffer. |
| 17 | No cleanup | TTL sweeps for both the render directory (`RENDER_RETENTION_MS`, default 6 h) and the GIF cache (24 h), each throttled so they do not run per request. |
| 18 | Sync fs on the request path | All of `assets.ts`, `user-videos.ts`, `gif-fetcher.ts`, `render-paths.ts` and the video route moved to `fs/promises`. The asset directory is resolved once per process and the listing cached for 60 s. |
| 19 | No security headers | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production, `poweredByHeader: false`. *Verified live.* |
| 20 | Config drift | `.env.example` rewritten against `lib/env.ts` (`GIPHY_API_KEY` replaces the phantom `TENOR_API_KEY`; the model default is correct). `/api/auth/config` derives the redirect URI from `APP_URL` instead of hardcoding localhost. README updated — including the verification claim and the guest-mode instructions. |
| 21 | `.agent-logs/` secret exposure | gitleaks job in CI plus `.gitleaks.toml` allowlisting only documented placeholders. The commit policy in `AGENTS.md` is unchanged. |
| 22 | No observability | Structured JSON logs in production with redaction, request ids end to end, and `GET /api/health` reporting AI/storage/ffprobe/auth readiness with a `degraded` status. |

---

---

## #23 — found during remediation: signed URLs were bypassable via static serving

Not in the original report; found by testing the fix rather than trusting it.

`getRendersDir()` wrote to `public/renders`, and **everything under `public/` is served statically by Next at its own path**. So `GET /renders/ugc_<id>.mp4` returned the full video with no signature, making the HMAC gate on `/api/video/[filename]` decorative. Filename guessability was again the only protection.

It mattered beyond development: on a self-hosted production deploy (`NODE_ENV=production` without `VERCEL`), renders are uploaded to blob storage *and* left sitting in `public/renders`, publicly addressable.

**Fixed:** renders are written to `.data/renders` (already gitignored), which nothing serves statically. The route reads from disk either way, so no other code changed. A regression test asserts the directory is never inside `public/`, and the `.gitignore` entries are annotated so the old location is not reintroduced.

*Verified:* static path → `404`, signed route → `200`, unsigned route → `404`, file confirmed in `.data/renders`.

---

## #24 — found during remediation: critical CVEs in the pinned Next.js

Also not in the original report. `npm audit` was never run on this project.

Next **16.3.4** carried eleven advisories, several critical, including unauthenticated remote code execution in the Image Optimization API (SVG) and in `use cache`, SSRF in image optimization, and SSG/ISR cache poisoning for self-hosted deployments. Most are not reachable through this app's own code — it uses neither `next/og` nor `use cache` — but the Image Optimization endpoint exists on every Next deployment whether the app calls it or not, so this was a live framework-level exposure, not a theoretical one.

**Fixed:** upgraded to **next 16.4.6** (and `eslint-config-next` to match), which clears all eleven. `npm audit fix` resolved the remaining transitive highs. One root cause needed a decision: `@vercel/blob → @vercel/oidc → @vercel/cli-config` pins a `zod` with a memory-exhaustion advisory, and the published remedy is to *downgrade* `@vercel/blob` — a breaking change. A `zod: ">=4.6.6"` override in `package.json` patches it within the same major instead.

**Result:** `npm audit --omit=dev` → **0 vulnerabilities**. A CI step now fails the build on any new high or critical advisory in the production tree.

> **Knowingly accepted:** ten dev-only advisories remain, two critical, all in the test/bundler toolchain (`tinypool`, vitest's worker pool). They are not in the deployed artifact and the RCE requires attacker-controlled worker options. Clearing them needs vitest 5, which demands `@types/node` ≥ 22 while CI targets Node 20 — bumping the types away from the runtime is the worse trade. Revisit when the project moves to Node 22.

---

## Notes

- `web/.env.local` was created for local testing with `ENABLE_DEMO_GUEST=true`. It is gitignored. Add your `GEMINI_API_KEY` there to exercise the full pipeline.
- `npm install` added `@ffprobe-installer/ffprobe` and `vitest`; `package-lock.json` is updated.
- The one thing not closed by code is #7's durability. Everything else is fixed and verified.
- #23 is a reminder that in Next.js, a file's *location* is part of its access control: `public/` is a public API surface, not a scratch directory.
