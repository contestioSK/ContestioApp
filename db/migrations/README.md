# Database Migrations

This directory contains SQL migrations that cannot be applied via `drizzle-kit push`
due to a known Zod validation bug in drizzle-kit with the `user_bait_brands` partial index.

## Running migrations

Requires `psql` and the `DATABASE_URL` environment variable (available in Replit).

```bash
# Apply all security tables (idempotent — safe to run multiple times)
npm run db:migrate
```

Or manually:

```bash
psql $DATABASE_URL -f db/migrations/001_security_tables.sql
```

## Migration history

| File | Tables created | Date applied |
|------|---------------|--------------|
| `001_security_tables.sql` | `competition_setup_tokens`, `processed_stripe_events` | 2026-02-24 |

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` — fully idempotent
- The standard `npm run db:push` handles all other schema changes via Drizzle ORM
- New developers: run `npm run db:migrate` once after cloning, then `npm run db:push` for the rest
