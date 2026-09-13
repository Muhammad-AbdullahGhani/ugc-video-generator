# ReelForge UGC — AI Marketing Video Studio 🎬⚡

A production-grade AI-driven UGC (User-Generated Content) marketing video generator built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Auth.js (NextAuth v5), and FFmpeg. ReelForge autonomously turns any product URL into a high-converting 9:16 vertical video with kinetic typography and trending audio.

---

## 🌟 Key Capabilities & Architecture

1. **Bespoke Visual Identity**:
   - Signature **Electric Studio Amber** (`#FF6B00`) accent on Deep Studio Obsidian backdrop (`#090A0C`).
   - Professional font pairing: **Space Grotesk** (display & branding) + **Plus Jakarta Sans** (conversational body) + **JetBrains Mono** (pipeline metrics & telemetry).
   - Custom radius tokens, micro-interactions, smooth message entrance animations, and responsive mobile layout.

2. **Real-Time Step Streaming**:
   - Streams granular intermediate status messages sequentially as Server-Sent Events (SSE) into an animated pipeline tracker instead of a black-box spinner:
     - `1. Reading [url]...`: Ingests product Markdown & value props via [Jina Reader](https://r.jina.ai/).
     - `2. Extracting product context...`: Synthesizes marketing hooks & pain points with Google Gemini.
     - `3. Generating UGC blueprint...`: Crafts viral typography hook and meme reaction queries.
     - `4. Curating media assets...`: Selects dynamic vertical background reel and matches trending soundtrack.
     - `5. Compositing video...`: Composites 1080x1920 MP4 at 30fps with kinetic typography and audio mix.
   - Comprehensive error recovery with direct **"Retry Generation"** and **"Edit Link"** actions.

3. **Interactive 9:16 Video Player**:
   - High-definition 9:16 preview player with scrubber, time display, mute/unmute, loop, and fullscreen.
   - 1-click **Download MP4** with automated blob resolution.
   - Link sharing with instant clipboard feedback toast.
   - Expandable blueprint breakdown drawer.

4. **Authentication & Session History (NextAuth.js / Auth.js v5)**:
   - Polished studio sign-in screen gating unauthenticated visitors.
   - **Google OAuth 2.0** provider for standard Google accounts.
   - **Demo Guest session** mode for instant zero-config evaluation.
   - **"My Videos"** drawer: Persists and associates all generated videos with the signed-in user's profile across sessions.
   - Header with user avatar, name, and sign-out controls.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Authentication**: Auth.js / NextAuth v5 (`next-auth@beta`) with Google OAuth & Credentials fallback
- **UI & Styling**: Tailwind CSS v4, Lucide React, Google Fonts (`Space_Grotesk`, `Plus_Jakarta_Sans`, `JetBrains_Mono`)
- **Scraping**: Jina AI Reader API (`https://r.jina.ai/[URL]`)
- **Intelligence**: Google Gemini API (`@google/generative-ai`)
- **Video Compositor**: FFmpeg with dynamic serverless storage adaptation (`/tmp` on Vercel)
- **Storage**: Vercel Blob / Zero-config cloud storage / Base64 streaming fallback

---

## 🚀 Getting Started

### 1. Installation

```bash
cd web
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required environment keys in `web/.env.local`:

```env
# 1. Google Gemini API Key (Required for scraping analysis & UGC script synthesis)
GEMINI_API_KEY=your_gemini_api_key_here

# 2. NextAuth.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_long
NEXTAUTH_URL=http://localhost:3000

# 3. Google OAuth Credentials (For Google Sign-In)
# Obtain from Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note for Evaluators / Local Testers**: If `GOOGLE_CLIENT_ID` is omitted, ReelForge automatically provides a **"Continue as Demo Creator (Instant Guest Session)"** option on the sign-in screen so the entire application can be tested end-to-end without needing pre-configured Google credentials!

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub.
2. In the **Vercel Dashboard**, import the repository.
3. In **Project Settings**:
   - Set **Root Directory** to `web`
   - Framework Preset: **Next.js**
4. In **Environment Variables**, configure:
   - `GEMINI_API_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production Vercel URL, e.g., `https://your-project.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. Click **Deploy**.
