"""Unit-test bootstrap: no database, no network, no .env needed.

`app.core.config.Settings` validates ~22 required variables at import time, so we provide harmless
values BEFORE anything imports the app.
"""
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "fastapi-eccomerce-backend"
sys.path.insert(0, str(BACKEND))

_REQUIRED = {
    "DATABASE_URL": "postgresql+asyncpg://u:p@localhost:5432/test",
    "SECRETE_JWT_KEY": "unit-test-secret-key-that-is-long-enough-0123456789",
    "MAIL_USER": "u", "MAIL_PASS": "p", "MAIL_HOST": "localhost", "MAIL_PORT": "1025",
    "MAIL_FROM": "t@example.com", "DELIVERY_PERSON_EMAIL": "d@example.com",
    "FRONTEND_URL": "http://localhost:3000", "BACKEND_URL": "http://localhost:8084",
    "RESET_PASSWORD_URL": "http://localhost:3000/reset-password",
    "GOOGLE_CLIENT_ID": "x", "GOOGLE_CLIENT_SECRET": "x",
    "GOOGLE_AUTH_BASE_URL": "https://accounts.google.com/o/oauth2/v2/auth",
    "GOOGLE_REDIRECT_URL": "http://localhost:8084/api/auth/google/callback",
    "STRIPE_SECRET_KEY": "sk_test_x",
    "AWS_ACCESS_KEY": "x", "AWS_SECRET_KEY": "x", "AWS_BUCKET_NAME": "b", "AWS_BUCKET_REGION": "us-east-1",
    "PAYMENT_CONFIRMATION_URL": "http://localhost:3000/payment/success",
    "PAYMENT_CANCEL_URL": "http://localhost:3000/payment/cancel",
}
for k, v in _REQUIRED.items():
    os.environ.setdefault(k, v)
