-- =====================================================================
-- 00 — Roles (least privilege)
-- Runs ONCE, on first start of an EMPTY postgres-data volume, as the bootstrap superuser
-- (docker-entrypoint-initdb.d executes *.sql in alphabetical order, against $POSTGRES_DB).
-- To re-run everything:   docker compose down -v && docker compose up -d --build
--
--   postgres       bootstrap superuser (admin tasks only — the app never uses it)
--   shopease_app   what the API connects as: owns the schema, NOT a superuser
--   exporter       read-only monitoring role for postgres-exporter (built-in pg_monitor)
--
-- Dev credentials. If you change a password here, change it in .env too (DATABASE_URL / exporter).
-- =====================================================================

CREATE ROLE shopease_app LOGIN PASSWORD 'shopease_app_pw'
    NOSUPERUSER NOCREATEDB NOCREATEROLE;

CREATE ROLE exporter LOGIN PASSWORD 'exporter_pw'
    NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 5;
GRANT pg_monitor TO exporter;

-- The application owns its database and the public schema (so Alembic can migrate later).
ALTER DATABASE shopease OWNER TO shopease_app;
ALTER SCHEMA public OWNER TO shopease_app;
