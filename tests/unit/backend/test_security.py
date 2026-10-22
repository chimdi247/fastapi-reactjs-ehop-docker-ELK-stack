"""app/core/security.py — JWT creation / validation."""
import time

import jwt
import pytest

from app.core import security
from app.core.exceptions import ApiException


def test_token_roundtrip_keeps_claims():
    token = security.create_access_token({"sub": "42", "role": "ADMIN"})
    payload = security.decode_access_token(token)
    assert payload["sub"] == "42" and payload["role"] == "ADMIN" and payload["exp"] > time.time()


def test_expired_token_is_401():
    expired = jwt.encode({"sub": "1", "exp": int(time.time()) - 10}, security.SECRETE_JWT_KEY, algorithm="HS256")
    with pytest.raises(ApiException) as e:
        security.decode_access_token(expired)
    assert e.value.status_code == 401


def test_tampered_or_foreign_token_is_rejected():
    foreign = jwt.encode({"sub": "1"}, "a-different-secret-key-0123456789abcdef", algorithm="HS256")
    for bad in (foreign, "not.a.jwt", ""):
        with pytest.raises(ApiException) as e:
            security.decode_access_token(bad)
        assert e.value.status_code == 401


def test_alg_none_attack_is_rejected():
    unsigned = jwt.encode({"sub": "1", "role": "ADMIN"}, key="", algorithm="none")
    with pytest.raises(ApiException):
        security.decode_access_token(unsigned)
