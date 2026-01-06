# Security & Privacy Hardening

This app uses Supabase with a public anon client. Enforce access in the database via Row‑Level Security (RLS) and use the following application safeguards.

## What’s implemented in code

- Security headers (CSP, HSTS, XFO, Referrer‑Policy, Permissions‑Policy).
- Client passwords are stored as SHA‑256 hashes (no plaintext) while you migrate to Supabase Auth.
- Markdown renderer escapes raw HTML and only allows a minimal subset (links use `rel="noopener noreferrer"`).

## Supabase RLS policies (configure in DB)

1) `trainees`
- Enable RLS.
- Policy (read own): `auth.uid() = id`.
- Policy (trainer read): allow role `trainer` to read minimal fields.
- Never expose `password` in any RPC/select list (or remove the column once migrated to Supabase Auth).

2) `daily_plans`
- Enable RLS.
- Policy (read): `auth.uid() = trainee_id OR is_trainer()`.
- Policy (write): `is_trainer()` only.

3) `notes`
- Enable RLS.
- Policy (read/write own): `auth.uid() = trainee_id`.
- Policy (trainer read): `is_trainer()`.

4) `recipes`
- Enable RLS.
- Policy (read): `true` (public library) or restrict as needed.
- Policy (write/delete): `is_trainer()`.

5) Storage bucket `recipe-images`
- Public read if you want public images.
- Restrict write/delete to `is_trainer()` via storage policies; validate path prefixes by `auth.uid()` or service role where appropriate.

> Define `is_trainer()` as a Postgres role check or a mapping table that links `auth.uid()` to your `trainers` table.

## Migration to Supabase Auth (recommended)

- Replace custom trainee auth with Supabase Auth (`auth.signUp`/`auth.signInWithPassword`).
- Drop `trainees.password` column; store `id = auth.uid()` and profile fields only.
- Update RLS to use `auth.uid()` everywhere.

## Additional options

- Add rate limiting for mutating routes with Vercel Edge Middleware or a serverless KV.
- Add audit logs for trainer writes to `daily_plans` and `recipes`.
- Consider setting `robots: noindex` if the app should not be crawled.

