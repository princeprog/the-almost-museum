# Almost

Almost is a private museum for unfinished ideas, abandoned projects, failed experiments, and things that almost existed.

The MVP is a frontend-only, local-first archive. Exhibits, stories, history, and attached files stay in the browser. There is no account, server, analytics, social feed, or automatic interpretation. JSON backup and restore keep the collection portable.

## Status

Implementation is being delivered in small, reviewed commits from the approved MVP plan in `docs/superpowers/plans/2026-08-23-almost-museum-mvp.md`.

## Product documentation

- [Project brief](./the-almost-museum-project-brief.pdf)
- [Approved MVP design](./docs/superpowers/specs/2026-08-23-almost-museum-mvp-design.md)
- [Implementation plan](./docs/superpowers/plans/2026-08-23-almost-museum-mvp.md)

## Local development

The application uses pnpm. Once the scaffold is present:

```bash
pnpm install
pnpm dev
```

Quality commands and browser verification are documented as the implementation lands.

## Privacy and portability

The browser owns the collection. Clear browser storage can remove local data, so the Settings screen provides a validated JSON export and restore workflow. Backups should be made before clearing site data or changing browsers.

## Roadmap exclusions

Museum maps, poster/HTML exports, encryption, optional cloud sync, accounts, collaboration, payments, AI interpretation, social features, and immersive 3D rooms are deliberately post-MVP work.

