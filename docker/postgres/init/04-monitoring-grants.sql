-- =====================================================================
-- 04 — Monitoring grants
-- postgres-exporter runs a few business-KPI queries (observability/postgres-exporter/queries.yaml).
-- Column-level SELECT only: the exporter can count orders/users but can never read e-mails,
-- addresses or password hashes.
-- =====================================================================
SET ROLE shopease_app;
GRANT SELECT (role, active)           ON users    TO exporter;
GRANT SELECT (status, total_price)    ON orders   TO exporter;
GRANT SELECT (status, amount)         ON payments TO exporter;
GRANT SELECT (stock_quantity)         ON products TO exporter;
RESET ROLE;
