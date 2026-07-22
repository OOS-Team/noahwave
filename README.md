# NoahWave · Cypher Archive

Personal generative-art site — cypherpunk terminal UI, static gallery, free deploy.

**Stack:** Next.js (React) · optional FastAPI backend · static works catalog

## Quick start (local)

```bash
npm install
npm run generate:works   # scan public/gallery → public/data/works.json
npm run dev
```

Open: http://localhost:3000

Optional backend (contact / vision API / live scan):

```bash
npm run dev:backend   # http://127.0.0.1:8000
```

Set in `.env.local` only if you use the API:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Free production deploy (no paid hosts)

### 1. Gallery works offline

Media lives under `public/gallery` and `public/images`.  
Catalog is static: `public/data/works.json` (regenerated on `npm run build`).

```bash
# After adding/removing art:
npm run generate:works
```

### 2. Contact form (free Formspree)

1. Sign up at [formspree.io](https://formspree.io) (free tier)  
2. Create a form → copy the id (`https://formspree.io/f/xxxxxxxx`)  
3. In Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_FORMSPREE_ID=xxxxxxxx
```

### 3. Push to GitHub (OOS-Team)

Repo: **https://github.com/OOS-Team/noahwave**

**Easiest (no system git / works if Xcode license blocks `git`):**

1. Create a personal access token: https://github.com/settings/tokens → scope **`repo`**
2. In the project folder:

```bash
export GITHUB_TOKEN=ghp_your_token_here
node scripts/push-to-github.mjs
```

**Or classic git** (after `sudo xcodebuild -license accept`):

```bash
./scripts/push-to-github.sh
```

### 4. Deploy on Vercel (free Hobby)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `OOS-Team/noahwave`  
2. Framework: **Next.js** (auto)  
3. Env: `NEXT_PUBLIC_FORMSPREE_ID` (optional but recommended)  
4. **Do not** set `NEXT_PUBLIC_API_URL` for the free static path  
5. Deploy → live URL like `https://noahwave.vercel.app`

Custom domain later: Vercel → Domains (still free on Hobby for personal use).

## Project layout

```
generative-art/
├── public/
│   ├── gallery/          # artworks (images + video)
│   ├── images/hero/      # hero debris
│   ├── models/           # face-api weights (client MATRIX lab)
│   └── data/works.json   # static catalog
├── scripts/
│   └── generate-works.mjs
├── backend/              # optional FastAPI
└── src/
    ├── app/
    ├── components/
    └── lib/api.ts        # static catalog + Formspree / API
```

## Adding artworks

1. Drop files into `public/gallery/`  
2. Optionally add titles in `scripts/generate-works.mjs` (and `backend/main.py` if you use the API)  
3. Run `npm run generate:works`  
4. Commit and push — Vercel redeploys  

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_FORMSPREE_ID` | for contact | Free Formspree form id |
| `NEXT_PUBLIC_API_URL` | optional | FastAPI base URL |

Copy `.env.example` → `.env.local` for local overrides.

## MATRIX lab

Face detection runs **entirely in the browser** (`public/models`). No backend needed.
