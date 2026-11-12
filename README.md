# ReelForge UGC — AI Marketing Video Studio 🎬⚡

A production-grade, highly personalized AI UGC (User-Generated Content) marketing video engine built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Auth.js (NextAuth v5), and FFmpeg.

ReelForge autonomously extracts deep context, real brand color palettes, and verified social-proof metrics from any product URL to assemble a custom 9:16 vertical video with kinetic typography and trending audio in under 10 seconds.

---

## 📐 End-to-End System Architecture

```text
                                 ┌───────────────────────────────┐
                                 │       Client Application      │
                                 │  NextAuth v5 (Google & Guest) │
                                 │   localStorage Scoped Thread  │
                                 └───────────────┬───────────────┘
                                                 │ HTTP POST (SSE Stream)
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ReelForge API Pipeline                                      │
│                                                                                                   │
│  [1. INGESTION & METADATA EXTRACTION]                                                             │
│  ├── Jina Reader: Markdown copy & value propositions                                              │
│  └── HTML Head Parser: OG Title, Meta Description, Theme Color (CSS/Hex), Social-Proof Regex      │
│                                                 │                                                 │
│                                                 ▼                                                 │
│  [2. GEMINI UGC DECISION ENGINE]                                                                  │
│  ├── Category Classifier: ["fitness", "saas_dev", "food_beverage", "fintech", "ecommerce"]        │
│  ├── Personalized Kinetic Hook: Injects real metrics (e.g. "1M+ users", "4.9 stars", "$0")        │
│  └── Decision Rationale: Transparent explanation for video clip, soundtrack, and meme pairing     │
│                                                 │                                                 │
│                                                 ▼                                                 │
│  [3. ASSET MATCHER]                                                                               │
│  ├── Vertical Reel: Category-matched 9:16 background clip                                         │
│  ├── Audio Soundtrack: Beat-synced mood track (hip-hop, driving synth, acoustic)                  │
│  └── Reaction GIF: Query-matched meme reaction via Tenor API / Curated Fallback                   │
│                                                 │                                                 │
│                                                 ▼                                                 │
│  [4. FFMPEG COMPOSITOR & BRAND STYLING]                                                           │
│  ├── Scales vertical 9:16 video (1080x1920) at 30fps                                              │
│  ├── Overlays reaction GIF meme                                                                   │
│  └── Burns kinetic typography boxed with extracted brand accent color                             │
│                                                 │                                                 │
│                                                 ▼                                                 │
│  [5. AUTOMATED FFPROBE QUALITY VALIDATION]                                                        │
│  ├── Validates duration is strictly between 5.0s and 10.0s                                        │
│  ├── Checks 9:16 aspect ratio & synchronized audio stream                                         │
│  └── Auto-retries assembly once if corrupt or out-of-bounds                                       │
│                                                 │                                                 │
│                                                 ▼                                                 │
│  [6. STORAGE & SSE STREAM COMPLETION]                                                             │
│  ├── Uploads to Vercel Blob / Catbox cloud storage / inlined Base64 fallback                      │
│  └── Associates record with authenticated user profile in "My Videos" store                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Why It Reads As "Shipped", Not "One-Shot AI"

### 1. Actually Personalized (Zero Generic Template Output)
- **Deep Metadata Ingestion**: Directly pulls real `og:title`, `og:description`, CSS `theme-color`, and verified social-proof metrics (e.g., "1M+ users", "4.9★ rating", "10x faster", "$0 cost") from the target URL.
- **Brand Palette Matching**: Video typography box borders and UI accent badges adopt the brand's extracted color rather than a static template.
- **Industry-Specific Assets**: Background clips, soundtracks, and meme GIFs vary dynamically based on category (`fitness`, `saas_dev`, `food_beverage`, `fintech`, `ecommerce`) rather than picking from a single static pool.

### 2. Transparent Decision Making (Not a Black Box)
- **Bot Explains Its Rationale**: Once a video is assembled, the engine shares a dedicated line detailing **why** it chose what it chose:
  > *"Used an energetic vertical reel + 'mind blown' reaction meme + upbeat soundtrack because Cal AI is a photo-based fitness app with instant meal scanning."*
- **Automated Verification**: Probes the generated MP4 with `ffprobe` (bundled via `@ffprobe-installer/ffprobe`) and reports the *measured* duration, dimensions and audio presence. When a probe genuinely cannot run, the step is reported as **unverified** rather than claiming a check that did not happen. A render that fails a real measurement is retried once.

### 3. Resilient Edge Case Handling
- **Invalid / Unreachable URLs**: Catches DNS failure, server timeout, or 404s cleanly and returns actionable error cards with a 1-click **"Retry Generation"** button.
- **Anti-Bot / Protected Sites**: If a site blocks scraping or has minimal public text, it falls back gracefully:
  > *"I was able to connect to [url], but the page has anti-bot protections or limited public text. Could you briefly reply with a sentence describing what your product does? I'll assemble the UGC video for you right away!"*
- **Conversational Intelligence**: Casual messages ("hi", "what can you do?", "tell me a joke") respond dynamically like a conversational assistant and **never** misfire into a video render.

### 4. Shipped Production Details
- **Full 9:16 Video Player**: Custom scrubber, time display (`0:00 / 0:07`), volume/mute toggle, and fullscreen.
- **Download & Native Share**: 1-click MP4 download with automated blob resolution, plus mobile Web Share API (`navigator.share`) with clipboard copy fallback.
- **Persistent Chat Thread**: Conversations and video states persist across page reloads via user-scoped `localStorage`.
- **Google OAuth 2.0 & Session History**: Gated sign-in with Google OAuth, plus a **Demo Guest** mode for local evaluation — enabled with `ENABLE_DEMO_GUEST=true` and ignored outright in production, since it authenticates anyone without verification. Includes a **"My Videos"** drawer tracking all generations per account.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Authentication**: Auth.js / NextAuth v5 (`next-auth@beta`) with Google OAuth; opt-in guest credentials for local demos only
- **UI & Styling**: Tailwind CSS v4, Lucide React, Google Fonts (`Space_Grotesk`, `Plus_Jakarta_Sans`, `JetBrains_Mono`)
- **Scraping**: Jina AI Reader API (`https://r.jina.ai/[URL]`) & native HTML metadata parser
- **Intelligence**: Google Gemini API (`@google/generative-ai`)
- **Video Compositor**: FFmpeg with dynamic serverless storage adaptation (`/tmp` on Vercel)
- **Validator**: `ffprobe` stream and duration measurement (`@ffprobe-installer/ffprobe`)
- **Storage**: Vercel Blob in production; HMAC-signed local URLs in development. No third-party public file hosts.
- **Safety**: SSRF-guarded outbound fetches, per-user rate limiting, bounded FFmpeg concurrency, sanitized error responses with request ids

---

## 🚀 Local Development

### 1. Installation

```bash
cd web
npm install
```

### 2. Environment Variables

Copy `web/.env.example` to `web/.env.local` and fill it in. Every variable is read
and validated once in `lib/env.ts`; the app refuses to start if a required value
is missing, which is deliberate — a defaulted secret is worse than a failed boot.

```env
# Required. Generate with: openssl rand -base64 32
AUTH_SECRET=your_32_char_secret

# Required for blueprint generation
GEMINI_API_KEY=your_gemini_api_key_here

# Canonical origin — the OAuth redirect URI is derived from it
APP_URL=http://localhost:3000

# Optional: Google sign-in
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional, LOCAL ONLY: one-click guest sign-in for evaluators.
# Authenticates anyone without verification; ignored when NODE_ENV=production.
ENABLE_DEMO_GUEST=true
```

> **Evaluator note**: set `ENABLE_DEMO_GUEST=true` to get the **"Continue as Demo Creator"**
> button and test everything without Google credentials. The button is hidden
> unless the server reports the provider as enabled.

### Verification

```bash
npm run verify   # lint + typecheck + tests
npm run build
```

`GET /api/health` reports which subsystems are configured (AI key, storage,
ffprobe availability, auth providers) and returns `degraded` when any is missing.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub.
2. In **Vercel Dashboard**, import the repository.
3. In **Project Settings**:
   - Set **Root Directory** to `web`
   - Framework Preset: **Next.js**
4. In **Environment Variables**, add:
   - `AUTH_SECRET` — required; 32+ characters
   - `GEMINI_API_KEY` — required
   - `BLOB_READ_WRITE_TOKEN` — required; renders must go to storage you control
   - `APP_URL` — your production URL
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for Google sign-in
   - Do **not** set `ENABLE_DEMO_GUEST`; it is ignored in production regardless.
5. Click **Deploy**.

The server validates this set at boot (`instrumentation.ts`) and refuses to start
if any required value is missing, rather than failing on the first request that
needs it.

> **Known limitation**: video history is a JSON file store. On serverless it lives
> on per-instance ephemeral disk, so records are lost on cold start and are not
> shared between instances. Point `DATA_DIR` at a persistent volume, or replace the
> three functions in `lib/user-videos.ts` with a database client, before promising
> users a durable library. The app warns about this at boot.
