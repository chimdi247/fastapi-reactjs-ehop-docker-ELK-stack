"""Direct database checks: init scripts ran, least-privilege roles behave."""
import os

import psycopg2
import pytest

DSN = dict(host=os.getenv("DB_HOST", "127.0.0.1"), port=int(os.getenv("DB_PORT", "5432")), dbname="shopease")


def conn(user, password):
    try:
        return psycopg2.connect(user=user, password=password, connect_timeout=5, **DSN)
    except psycopg2.OperationalError as e:
        pytest.skip(f"cannot reach postgres: {e}")


def q(c, sql, *a):
    with c.cursor() as cur:
        cur.execute(sql, a)
        return cur.fetchall()


def test_all_tables_exist():
    c = conn("shopease_app", "shopease_app_pw")
    got = {r[0] for r in q(c, "select tablename from pg_tables where schemaname='public'")}
    assert {"users", "carts", "cart_items", "categories", "products", "orders", "order_items",
            "payments", "reviews", "notifications", "reset_codes", "alembic_version"} <= got


def test_admin_row_has_an_argon2id_hash_not_a_plain_password():
    c = conn("shopease_app", "shopease_app_pw")
    (email, pw, role), = q(c, "select email, hashed_password, role::text from users where email=%s", "chimdi247@gmail.com")
    assert role == "ADMIN" and pw.startswith("$argon2id$") and "password123" not in pw


def test_seed_hash_verifies_with_the_apps_hasher():
    from pwdlib import PasswordHash
    c = conn("shopease_app", "shopease_app_pw")
    (pw,), = q(c, "select hashed_password from users where email=%s", "chimdi247@gmail.com")
    assert PasswordHash.recommended().verify("password123", pw)


def test_alembic_is_stamped_at_baseline():
    c = conn("shopease_app", "shopease_app_pw")
    assert q(c, "select version_num from alembic_version") == [("20b260ce7382",)]


def test_app_role_is_not_a_superuser():
    c = conn("shopease_app", "shopease_app_pw")
    assert q(c, "select rolsuper from pg_roles where rolname=current_user") == [(False,)]


def test_exporter_cannot_read_password_hashes():
    c = conn("exporter", "exporter_pw")
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        q(c, "select hashed_password from users")
    c.rollback()
    assert q(c, "select count(*) from users where active")[0][0] >= 1     # but the KPI query works
