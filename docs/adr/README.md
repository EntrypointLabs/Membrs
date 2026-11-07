# Architectural Decision Records

Decisions for `membrs-frontend`, in the same format as the Prydd monorepo:
[MADR](https://adr.github.io/madr/) 3.0, one decision per file, numbered.
Start from [`TEMPLATE.md`](./TEMPLATE.md).

Write one when a decision is hard to reverse, surprising, cross-cutting or
contested. Routine choices do not need one.

| ADR                                                     | Title                                       | Status   |
| ------------------------------------------------------- | ------------------------------------------- | -------- |
| [0001](./0001-single-vite-app.md)                       | One Vite app, not a monorepo                | Accepted |
| [0002](./0002-fixtures-behind-api-layer.md)             | Typed fixtures behind an API layer          | Accepted |
| [0003](./0003-tailwind-with-css-tokens.md)              | Tailwind with theme tokens as CSS variables | Accepted |
| [0004](./0004-dependency-free-router.md)                | A dependency-free history router            | Accepted |
| [0005](./0005-views-and-categories-share-one-picker.md) | Time views and categories share one picker  | Accepted |
