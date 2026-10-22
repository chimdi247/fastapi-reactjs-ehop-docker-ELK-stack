import uuid

from conftest import Api


def test_seeded_admin_logs_in_with_admin_role(admin):
    me = admin.get("/users/me").json()["data"]
    assert me["email"] == "chimdi247@gmail.com"
    assert str(me["role"]).upper() == "ADMIN"


def test_wrong_password_is_rejected():
    r = Api().login("chimdi247@gmail.com", "definitely-wrong")
    assert r.status_code in (400, 401)
    assert "token" not in r.text.lower() or r.json().get("data") is None


def test_unknown_user_is_rejected():
    assert Api().login(f"nobody-{uuid.uuid4().hex[:6]}@example.com", "x").status_code in (400, 401, 404)


def test_register_creates_a_customer_and_hides_the_password(customer):
    me = customer.get("/users/me").json()["data"]
    assert me["email"] == customer.email
    assert str(me["role"]).upper() == "CUSTOMER"
    assert "password" not in str(me).lower()


def test_duplicate_registration_is_a_conflict(customer):
    r = customer.post("/auth/register", json={"name": "Dup", "email": customer.email, "password": "secret123"})
    assert r.status_code in (400, 409)


def test_invalid_email_is_a_validation_error():
    assert Api().post("/auth/register", json={"name": "x", "email": "not-an-email", "password": "secret123"}).status_code == 422


def test_protected_routes_need_a_token():
    for path in ("/users/me", "/cart", "/orders/me"):
        assert Api().get(path).status_code in (401, 403), path


def test_garbage_token_is_rejected():
    c = Api(); c.token = "not.a.jwt"
    assert c.get("/users/me").status_code in (401, 403)


def test_customer_cannot_use_admin_endpoints(customer):
    assert customer.get("/users/all-users").status_code in (401, 403)
    assert customer.get("/orders/all").status_code in (401, 403)


def test_admin_can_list_users(admin):
    r = admin.get("/users/all-users")
    assert r.status_code == 200


import pytest  # noqa: E402


@pytest.mark.xfail(reason="KNOWN SECURITY ISSUE: POST /api/auth/register is public and honours a client-supplied "
                          "`role`, so anyone can create an ADMIN. Remove this marker once the API ignores/validates it.",
                   strict=False)
def test_public_registration_cannot_create_an_admin():
    c = Api()
    email = f"escalate-{uuid.uuid4().hex[:8]}@example.com"
    assert c.post("/auth/register", json={"name": "Mallory", "email": email, "password": "secret123", "role": "ADMIN"}).status_code == 201
    c.login(email, "secret123")
    assert str(c.get("/users/me").json()["data"]["role"]).upper() != "ADMIN"
