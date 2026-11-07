# membrs-frontend

## Agent skills

### Domain docs

Single-context. The domain glossary is `CONTEXT.md` at the repo root, and decisions are ADRs under `docs/adr/` (index in `docs/adr/README.md`). See `docs/agents/domain.md`.

## Conventions

- Screens live in `src/screens/*Screen.tsx`, shared UI in `src/components/`, and everything without JSX in `src/lib/`.
- Every read goes through `src/lib/api.ts`. Screens never import fixtures directly.
- Form controls are shadcn/ui, in `src/components/ui/`. Add more with `npx shadcn@latest add <name>`; `components.json` is set up. In those files shadcn's `accent` hover fill is swapped for `soft-hover`, because `accent` here is the link blue.
- Every URL comes from `paths` in `src/lib/router.ts`. Never spell a path by hand.
- Colours, radii and fonts come from the tokens in `src/index.css`. No hex values in components except a category or section colour that has no token.
- Headings go through `titleCase()` (New York Times style).
- Tests sit next to the code: `*.spec.ts` for `lib/`, `*.test.tsx` for components and screens.
- Comments explain why, not what. Write them as full sentences.
- No em dashes anywhere, in code comments, copy or docs.
