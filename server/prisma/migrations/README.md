# Prisma migrations

`20260101000000_init/migration.sql` is a **hand-written baseline** that was
translated by inspection from `prisma/schema.prisma`. Prisma normally
generates this file via `prisma migrate dev` against a real Postgres, but the
project was scaffolded without one available, so this file fills in for first
deploys.

## Verifying the baseline before relying on it

Run this once against a fresh local Postgres and reconcile any drift:

```bash
# Get Prisma's expected DDL from the schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/expected.sql

# Compare against the hand-written file
diff /tmp/expected.sql prisma/migrations/20260101000000_init/migration.sql
```

Any drift you see is likely:

- Different index names (Prisma uses `_idx` / `_key` suffixes; we matched)
- Different FK constraint names
- Slightly different column-default formatting

If the diff is non-trivial, the safe play is to delete the hand-written file
and run `npx prisma migrate dev --name init` against an empty database — Prisma
will generate a known-correct baseline. Commit that file in place of this one.

## Going forward

Subsequent schema changes should land via `npx prisma migrate dev --name
<change>` so each migration is generated, reviewed in PR, and applied via
`prisma migrate deploy` in production. The Docker image already runs
`migrate deploy` on startup.
