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

## Free production deploy

### Push to GitHub (OOS-Team)

Repo: **https://github.com/OOS-Team/noahwave**

**Easiest (works without system git / Xcode license):**

1. Create a PAT: https://github.com/settings/tokens → scope **repo**
2. Run:

```bash
export GITHUB_TOKEN=ghp_your_token_here
node scripts/push-to-github.mjs
```

### Deploy on Vercel (free)

1. https://vercel.com → import `OOS-Team/noahwave`
2. Env: `NEXT_PUBLIC_FORMSPREE_ID` (optional, free contact)
3. Deploy

## Contact form

Formspree free: set `NEXT_PUBLIC_FORMSPREE_ID` in Vercel env.

## MATRIX lab

Face detection runs entirely in the browser (`public/models`).
