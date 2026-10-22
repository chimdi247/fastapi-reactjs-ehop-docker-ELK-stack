"""Guards the files in docker/postgres/init so they cannot drift from the application."""
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
INIT = ROOT / "docker" / "postgres" / "init"
MODELS = ROOT / "fastapi-eccomerce-backend" / "app" / "models"


def test_admin_seed_hash_verifies_with_the_apps_own_hasher():
    pwdlib = pytest.importorskip("pwdlib")
    sql = (INIT / "02-seed-admin-user.sql").read_text()
    phc = re.search(r"'(\$argon2id\$[^']+)'", sql).group(1)
    hasher = pwdlib.PasswordHash.recommended()
    assert hasher.verify("password123", phc)
    assert not hasher.verify("wrong-password", phc)


def test_admin_seed_is_the_requested_account():
    sql = (INIT / "02-seed-admin-user.sql").read_text()
    assert "'chimdi247@gmail.com'" in sql and "'ADMIN'" in sql
    assert "password123" not in re.sub(r"--.*", "", sql)          # never stored in plain text (comments aside)


def test_schema_sql_matches_sqlalchemy_models():
    """Every model table/column exists in 01-schema.sql and vice-versa (AST-based, no DB needed)."""
    import ast
    models = {}
    for f in MODELS.glob("*.py"):
        for c in [n for n in ast.parse(f.read_text(encoding="utf-8")).body if isinstance(n, ast.ClassDef)]:
            table, cols = None, set()
            for st in c.body:
                if isinstance(st, ast.Assign) and any(getattr(t, "id", "") == "__tablename__" for t in st.targets):
                    table = st.value.value
                if (isinstance(st, ast.AnnAssign) and isinstance(st.value, ast.Call)
                        and getattr(st.value.func, "id", "") == "mapped_column"):
                    cols.add(st.target.id)
            if table:
                models[table] = cols

    sql = (INIT / "01-schema.sql").read_text()
    tables = {}
    for m in re.finditer(r"CREATE TABLE (\w+) \((.*?)\n\);", sql, re.S):
        tables[m.group(1)] = {
            line.strip().split()[0] for line in m.group(2).splitlines()
            if line.strip() and not line.strip().startswith(("--", "UNIQUE", "CONSTRAINT", "PRIMARY"))
        }
    tables.pop("alembic_version", None)
    assert tables == models


def test_alembic_baseline_is_stamped():
    head = re.search(r"revision\s*[:=].*?['\"](\w+)['\"]",
                     next((ROOT / "fastapi-eccomerce-backend" / "migrations" / "versions").glob("*.py")).read_text()).group(1)
    assert f"'{head}'" in (INIT / "01-schema.sql").read_text()
