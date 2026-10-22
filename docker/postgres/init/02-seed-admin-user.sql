-- =====================================================================
-- 02 — Seed ADMIN user
--
--   e-mail    : chimdi247@gmail.com
--   password  : password123
--   role      : ADMIN
--
-- The password is NOT stored in plain text: it is an Argon2id hash in the exact format the API
-- produces and verifies (pwdlib PasswordHash.recommended() -> argon2-cffi defaults:
-- m=65536 KiB, t=3, p=4, 16-byte salt, 32-byte hash).
--
-- Generate another one:
--   python -c "from pwdlib import PasswordHash; print(PasswordHash.recommended().hash('your-password'))"
--
-- (This hash was generated with a standard Argon2id implementation and verified: correct password
--  -> match, wrong password -> mismatch.)
--
-- Because the e-mail is the same one used for Google OAuth in .env, signing in with Google also
-- resolves to this account.
-- =====================================================================
INSERT INTO users (email, hashed_password, name, role, active, created_at)
VALUES (
    'chimdi247@gmail.com',
    '$argon2id$v=19$m=65536,t=3,p=4$YWl5OHdmMJN7VbWBQmXlKA$1SPMTG7eWkNdoCWPC7bp17haLf/T9sAFFAqVon8gBx0',
    'Chimdi (Admin)',
    'ADMIN',
    TRUE,
    now()
)
ON CONFLICT (email) DO NOTHING;      -- idempotent: never overwrite an existing account
