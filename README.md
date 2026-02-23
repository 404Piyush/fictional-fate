# Fictional Fate

A swipe-style quiz that matches you with a fictional couple and a “dating vibe” archetype.

## Tech

- Next.js (App Router)
- React
- Tailwind CSS
- Framer Motion

## Local Dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

- UI: `src/components/FictionalFateMatcher.tsx`
- Data (questions + couples): `src/lib/fictional-fate-data.ts`
- Static assets:
  - Images: `public/img/**` (served at `/img/...`)
  - Audio: `public/audio/**` (served at `/audio/...`)
  - Cursors: `public/cursors/**` (served at `/cursors/...`)

## Deploy (Netlify)

Netlify build settings:

- Build command: `npm run build`
- Publish directory: `.next`

If you’re using Netlify’s Next.js runtime/plugin, keep the defaults that Netlify suggests for Next.js projects.

## Troubleshooting

### Images/audio missing on Netlify

Make sure assets live inside `public/` and are committed to Git.

Common gotcha: `public/img` must not be a symlink to a folder outside the repo. Symlinks to `/Users/...` work locally but will be missing on GitHub/Netlify.

Quick checks:

```bash
ls -la public/img
git ls-tree -r --name-only HEAD public/img | head
```
