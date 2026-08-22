# Almost Museum MVP Design

## Product intent

Almost gives unfinished work a place to exist. It preserves the artifact, the story around it, the history of what happened, and a calm next decision. The product is a private museum rather than a task manager, social network, or productivity scorecard.

## MVP boundary

The first goal delivers Exhibit capture, local persistence, gallery browsing, detail editing, chronological history, Revive/Archive/Complete/Transform/Release closure actions, JSON backup and restore, and offline use after the first visit. The museum map, visual exports, encrypted vault, cloud sync, and walkable gallery are later goals.

First launch is empty. The user may explicitly install the Harbor Queue Redesign demo Exhibit. Demo installation is idempotent and never silently adds personal data.

## Experience decisions

- Routes: `/`, `/museum`, `/exhibit/new`, `/exhibit?id=...`, `/settings`, and `/offline`.
- Capture has three steps: identity, evidence, and story.
- Required capture fields are title, type, initial status, and museum label. Reflective fields and artifacts are optional.
- Rooms are curated filters: Workshop contains unfinished/active/revived; Archive contains archived/completed/released; Hall of Second Chances contains revived/transformed. A record may appear in overlapping rooms.
- Release requires confirmation. Closure never deletes an Exhibit.
- Transform links the source to a new or existing target in one transaction.
- Backup restore validates and previews the complete archive, then replaces the current collection atomically after confirmation. Merge import is deferred.

## Data contracts

The canonical records are `Exhibit`, `Artifact`, and `HistoryEvent`, with the exact unions and fields defined in the implementation plan. Dexie stores each record type in a separate table. All writes go through `ExhibitRepository`, which emits history events in the same transaction.

Images, PDFs, and audio are accepted up to 25 MiB per file. Links and notes do not contain blobs. Zustand stores only ephemeral UI state and view preferences; Dexie is the source of truth.

## Visual and voice direction

Use warm ivory, charcoal, muted rust, aged brass, sage, and faded blue with editorial serif display type, neutral sans-serif interface type, and mono labels. Use large margins, framed artifacts, thin rules, subtle paper texture, and slow motion. Copy is reflective, direct, and non-judgmental: use “Move to Archive,” “Unvisited,” “Collection,” and “History.” Respect reduced-motion preferences and make status understandable without color alone.

## Technical boundary

Use Next.js App Router with static export, TypeScript, Tailwind, shadcn/ui, Motion, Dexie, Zustand, React Hook Form, Zod, Vitest, and Playwright. Use Serwist for the service worker and offline shell. Do not add API routes, Server Actions, authentication, databases, cloud file storage, telemetry, or AI APIs.

