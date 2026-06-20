# Francisco Cardenas — Portfolio

Personal portfolio website — **"The Drawing Set"**, an interactive architectural
drawing sheet you drag across, with a slide-out detail panel and a one-page résumé view.

Built with Next.js, React, TypeScript, and Tailwind CSS.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:3000.

## Edit content (the easy part)

**Almost everything you'd want to change — your name, wording, jobs, skills,
links, and which photo goes where — lives in ONE file:**

```
src/content/site.ts
```

Open it, change the text between the `"quotes"`, save, and the site updates. You
do not need to touch any other file for normal edits.

## Edit images

Photos live in:

```
public/images/
```

To swap a photo, drop the new image into `public/images/` and update the matching
path in `src/content/site.ts`. To replace a photo without changing any code, give
the new file the **same filename** as the old one.

## How it's organized

- `src/content/site.ts` — all the editable text, links, and image paths.
- `src/components/Portfolio.tsx` — the interactive blueprint design (you rarely edit this).
- `src/app/globals.css` — the colors and styles. The four color themes are at the very top.
- `src/app/layout.tsx` — fonts and the browser tab title.

## Build

```
npm run build
```

## Deploy

Hosted on Vercel. Every push to `main` redeploys the live site automatically.
