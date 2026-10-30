---
name: Workspace API schema runtime
description: Runtime limitations when using generated API Zod schemas from the API server
---

Generate frontend API clients and types from the OpenAPI contract, but validate API-server output with a local Zod schema unless the workspace schema package's runtime exports have been fixed.

**Why:** The API server build can bundle successfully while Node ESM still fails at startup when importing the source-based `@workspace/api-zod` barrel, because its extensionless generated-module re-export cannot be resolved at runtime.

**How to apply:** Use generated React Query hooks and TypeScript response types in the frontend. In API routes, define a matching local Zod response schema and serialize database dates explicitly.

The web artifact's full TypeScript check may also fail on existing React/Lucide JSX type conflicts and stale imports outside the changed feature. Check diagnostics for changed files and run the Vite production build before attributing those existing errors to a new change.
