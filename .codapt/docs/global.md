This is a full-stack TypeScript application. We use:

- TanStack Router
- React
- tRPC
- Prisma ORM
- Tailwind
- Zod
- Docker & Docker Compose
- Zustand & Zustand Persist middleware

Whenever possible, try to break up large pages/components into smaller components in their own files.

When storing data like auth tokens, we should use Zustand Persist.

You can import from `src/...` with the alias `~/...`.

Never use headers with tRPC. Pass all data, including authentication tokens, as parameters. Avoid using tRPC middleware -- use helper functions in procedures to handle things like authentication.

For all frontend components, focus on good design, using your own judgement when there is not a clear intended direction. Take two passes at each component/page -- first, implement the functionality, then re-visit it to improve the design as per any specifications or best practices.

When you're creating pages that don't wrap other pages, **always** include "index.tsx" in the filename so that we don't accidentally have clashing routes. See the `tanstack-router/pages` document for details.

When you use new packages/libraries, make sure to read documents related to them. You do not need to modify `package.json` to install them -- our developer tooling will automatically update `package.json` and install new dependencies when we run the app.
