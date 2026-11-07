# membrs-frontend

The membrs web app: events, opportunities, places and promos worth your time,
and the Sunday Digest that sends the best of them to your inbox. One Vite and
React app, laid out like `apps/checkout` in the Prydd monorepo.

What membrs is, and the vocabulary the code uses, is in [`CONTEXT.md`](./CONTEXT.md).
Decisions are in [`docs/adr/`](./docs/adr/README.md).

## Stack

| Piece   | Choice                                                      |
| ------- | ----------------------------------------------------------- |
| Build   | Vite 8, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`) |
| UI      | React 19, Tailwind CSS 4 (tokens in `src/index.css`)        |
| Routing | A dependency-free history router (`src/lib/router.ts`)      |
| State   | Tiny persisted stores (`src/lib/store.ts`), no library      |
| Data    | Typed fixtures behind `src/lib/api.ts`                      |
| Tests   | Vitest, `renderToStaticMarkup` for components               |
| Lint    | ESLint 9 flat config, Prettier with the Tailwind plugin     |
| Hooks   | Husky + lint-staged on commit                               |

## Setup

```
npm install
cp .env.example .env
npm run dev
```

The app runs on http://localhost:5173. With `VITE_API_BASE` empty it reads the
bundled fixtures, which is how the lite rollout ships.

## Scripts

| Script                | What it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `npm run images`      | Build responsive photos (runs on its own before dev and build) |
| `npm run dev`         | Vite dev server                                                |
| `npm run build`       | Type-check, then build to `dist/`                              |
| `npm run preview`     | Serve the built `dist/`                                        |
| `npm run check-types` | `tsc --noEmit`                                                 |
| `npm run lint`        | ESLint                                                         |
| `npm run test`        | Vitest                                                         |
| `npm run format`      | Prettier over ts, tsx, css, md and json                        |

## Layout

```
src/
├── main.tsx            entry: mounts <App /> in StrictMode
├── App.tsx             route switch, page chrome and overlays
├── index.css           Tailwind import and every design token
├── lib/                no React components: data, routing, rules
│   ├── api.ts          every read and write; fixtures today, API later
│   ├── config.ts       env and constants
│   ├── router.ts       history router, Route type, path builders
│   ├── types.ts        the shapes the API has to return
│   ├── views.ts        time views (Tonight, Closing Next Week…)
│   ├── dates.ts        tags, urgency, sort order
│   ├── hours.ts        opening hours and open-now state
│   ├── search.ts       weighted token search
│   ├── cookies.ts      cookie consent
│   ├── preferences.ts  theme, city, subscription, interests
│   ├── auth.ts         Google and Apple sign-in, the session
│   ├── ads.ts          ad day rates, run lengths and quotes
│   ├── payments.ts     Bachs checkout for ads
│   ├── store.ts        the persisted store primitive
│   └── *.spec.ts       unit tests next to the code
├── components/         shared UI: cards, rows, chrome, modals
├── screens/            one file per page, *Screen.tsx; lazy.ts splits them
├── generated/          photos.json: sizes and blur previews, from the script
└── fixtures/           JSON data until the backend lands
assets/photos/          source photos, one per id
public/images/          built AVIF and WebP at five widths (git-ignored)
```

## Deploying

`vercel.json` builds with `npm run build`, serves `dist/` and rewrites every
path to `index.html` so deep links work. Hashed files in `/assets` are cached
for a year; photos for a day, then revalidated in the background.

## Speed

- Home ships in the first bundle; every other screen is its own chunk and
  starts loading when a link is hovered or touched.
- React sits in its own chunk so it stays cached across deploys.
- Photos are AVIF with a WebP fallback at 160 to 1440px, chosen by `sizes`,
  lazy below the fold, with the width and height set so nothing jumps and a
  blurred preview inlined while they load. The hero image is fetched first.
- The legal text and the Bachs script load only when someone needs them.

## Payments

Ads are paid upfront with Bachs. The browser half is in `src/lib/payments.ts`;
the server half and the webhook flow are in [docs/payments.md](docs/payments.md).
Without `VITE_API_BASE` the checkout runs as a labelled demo.
