import os
import time
import uuid

import pytest
import requests

API = os.getenv("API_URL", "http://localhost:8084")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "chimdi247@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password123")


class Api:
    """Tiny client for the ShopEase API. Responses are wrapped as {status, message, data}."""

    def __init__(self, base=API):
        self.base, self.s, self.token = base, requests.Session(), None

    def _h(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def get(self, path, **kw):    return self.s.get(f"{self.base}/api{path}", headers=self._h(), timeout=20, **kw)
    def post(self, path, **kw):   return self.s.post(f"{self.base}/api{path}", headers=self._h(), timeout=30, **kw)
    def patch(self, path, **kw):  return self.s.patch(f"{self.base}/api{path}", headers=self._h(), timeout=20, **kw)
    def delete(self, path, **kw): return self.s.delete(f"{self.base}/api{path}", headers=self._h(), timeout=20, **kw)

    def login(self, email, password):
        r = self.post("/auth/login", json={"email": email, "password": password})
        if r.status_code == 200:
            self.token = r.json()["data"]["token"]
        return r


def wait_until(fn, timeout=60, interval=2.0):
    """Poll until fn() is truthy (telemetry is asynchronous: batch + export + index)."""
    end, last = time.time() + timeout, None
    while time.time() < end:
        try:
            last = fn()
            if last:
                return last
        except requests.RequestException:
            pass
        time.sleep(interval)
    return last


@pytest.fixture(scope="session", autouse=True)
def stack_is_up():
    for _ in range(40):
        try:
            if requests.get(f"{API}/api/health", timeout=3).status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(2)
    pytest.exit(f"API not reachable at {API} — run `docker compose up -d --build` first", 2)


@pytest.fixture(scope="session")
def admin():
    c = Api()
    r = c.login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"seeded admin cannot log in: {r.status_code} {r.text}"
    return c


@pytest.fixture()
def customer():
    c = Api()
    c.email, c.password = f"it-{uuid.uuid4().hex[:10]}@example.com", "secret123"
    r = c.post("/auth/register", json={"name": "Integration Tester", "email": c.email, "password": c.password})
    assert r.status_code == 201, r.text
    assert c.login(c.email, c.password).status_code == 200
    return c
