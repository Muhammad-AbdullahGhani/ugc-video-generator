# UGC Video Generator 🎬⚡

An AI-driven UGC (User-Generated Content) marketing video generator with a minimalist matte dark grey chat interface built on Next.js 16 (App Router) and Tailwind CSS v4.

## 🌟 How It Works

1. **Conversational Assistant**: Chat casually ("hi", "what can you do?"), and the AI responds naturally like ChatGPT without triggering unnecessary rendering.
2. **Context Extraction**: Drop a product URL (e.g., `https://calai.app`), and the system automatically scrapes website Markdown via [Jina Reader](https://r.jina.ai/).
3. **AI Video Blueprint**: Google Gemini (`gemini-flash-latest`) analyzes product value propositions and generates a viral UGC blueprint:
   - Punchy kinetic hook text
   - Relevant reaction GIF meme search term
   - Background vertical video selection
   - Matching soundtrack audio track
4. **FFmpeg Assembly**:
   - Trims vertical 9:16 background video
   - Overlays fetched reaction GIF
   - Burns kinetic hook typography with custom font styling
   - Strips original video audio and mixes upbeat background music with audio fade-out
   - Outputs ready-to-download `.mp4` directly in the chat

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide React (Matte dark grey theme)
- **Scraping**: Jina AI Reader API (`https://r.jina.ai/[URL]`)
- **LLM Brain**: Google Gemini API (`@google/generative-ai`)
- **GIF Engine**: Tenor API with local curated fallback assets
- **Compositor**: FFmpeg with dynamic serverless storage adaptation (`/tmp` on Vercel)

---

## 🚀 Local Development

1. Navigate to the `web` directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub.
2. In **Vercel Dashboard**, click **Add New Project** and import the repository.
3. In **Project Settings**:
   - Set **Root Directory** to `web`
   - Framework Preset: **Next.js**
4. In **Environment Variables**:
   - Add `GEMINI_API_KEY`: Your Google Gemini API Key
   - *(Optional)* Add `TENOR_API_KEY`: For dynamic reaction GIF lookups
5. Click **Deploy**.
