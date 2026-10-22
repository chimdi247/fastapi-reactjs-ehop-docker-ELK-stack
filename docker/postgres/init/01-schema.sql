-- =====================================================================
-- 01 — Schema
-- Mirrors migrations/versions/20b260ce7382_initial_migration.py (+ the SQLAlchemy models) exactly:
-- same tables, columns, enum types (named like SQLAlchemy names them), indexes and constraints.
-- It also stamps alembic_version, so a future `alembic upgrade head` starts from this baseline
-- instead of trying to re-create everything.
--
-- Beyond the migration it adds DB-level DEFAULTs. The ORM supplies values itself, so this is
-- purely defensive (hand-written INSERTs, the seed scripts, BI tools).
-- =====================================================================

SET ROLE shopease_app;          -- objects below are owned by the application role

-- ───────────────────────────── enum types ─────────────────────────────
CREATE TYPE userrole         AS ENUM ('ADMIN', 'CUSTOMER', 'DELIVERY');
CREATE TYPE orderstatus      AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE paymentstatus    AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE notificationtype AS ENUM ('WELCOME', 'ORDER_UPDATE', 'PAYMENT_UPDATE', 'PROMOTIONAL', 'SECURITY');

-- ───────────────────────────── standalone tables ─────────────────────────────
CREATE TABLE categories (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR NOT NULL,
    description  VARCHAR
);
CREATE UNIQUE INDEX ix_categories_name ON categories (name);

CREATE TABLE notifications (
    id                 SERIAL PRIMARY KEY,
    recipient_email    VARCHAR          NOT NULL,
    title              VARCHAR          NOT NULL,
    message            VARCHAR          NOT NULL,
    notification_type  notificationtype NOT NULL,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_recipient_email ON notifications (recipient_email);

CREATE TABLE reset_codes (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR     NOT NULL,
    code        VARCHAR     NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_reset_codes_code  ON reset_codes (code);
CREATE INDEX        ix_reset_codes_email ON reset_codes (email);

-- ───────────────────────────── users / carts ─────────────────────────────
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR     NOT NULL,
    hashed_password  VARCHAR,                                  -- NULL for Google-OAuth-only accounts
    name             VARCHAR     NOT NULL,
    profile_picture  VARCHAR,
    address          VARCHAR,
    role             userrole    NOT NULL DEFAULT 'CUSTOMER',
    active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX        ix_users_name  ON users (name);
CREATE INDEX        ix_users_role  ON users (role);

CREATE TABLE carts (
    id       SERIAL PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users (id),
    UNIQUE (user_id)
);

-- ───────────────────────────── catalogue ─────────────────────────────
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR        NOT NULL,
    description     VARCHAR        NOT NULL,
    price           NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity  INTEGER        NOT NULL DEFAULT 0,
    image_url       VARCHAR,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    category_id     INTEGER        NOT NULL REFERENCES categories (id)
);
CREATE INDEX ix_products_name ON products (name);

CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    cart_id     INTEGER NOT NULL REFERENCES carts (id),
    product_id  INTEGER NOT NULL REFERENCES products (id),
    quantity    INTEGER NOT NULL
);

-- ───────────────────────────── orders / payments ─────────────────────────────
CREATE TABLE orders (
    id                SERIAL PRIMARY KEY,
    total_price       NUMERIC(10, 2) NOT NULL,
    status            orderstatus    NOT NULL DEFAULT 'PENDING',
    shipping_address  VARCHAR        NOT NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    user_id           INTEGER        NOT NULL REFERENCES users (id)
);

CREATE TABLE order_items (
    id           SERIAL PRIMARY KEY,
    quantity     INTEGER        NOT NULL,
    unit_price   NUMERIC(10, 2) NOT NULL,
    is_reviewed  BOOLEAN        NOT NULL DEFAULT FALSE,
    order_id     INTEGER        NOT NULL REFERENCES orders (id),
    product_id   INTEGER        NOT NULL REFERENCES products (id)
);

CREATE TABLE payments (
    id                       SERIAL PRIMARY KEY,
    amount                   NUMERIC(10, 2) NOT NULL,
    currency                 VARCHAR        NOT NULL DEFAULT 'usd',
    status                   paymentstatus  NOT NULL DEFAULT 'PENDING',
    provider_transaction_id  VARCHAR        NOT NULL,
    payment_method           VARCHAR        NOT NULL,
    order_id                 INTEGER        NOT NULL REFERENCES orders (id),
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (order_id)
);
CREATE UNIQUE INDEX ix_payments_provider_transaction_id ON payments (provider_transaction_id);

-- ───────────────────────────── reviews ─────────────────────────────
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    rating      INTEGER     NOT NULL,
    comment     VARCHAR     NOT NULL,
    username    VARCHAR     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    product_id  INTEGER     NOT NULL REFERENCES products (id),
    user_id     INTEGER     NOT NULL REFERENCES users (id),
    CONSTRAINT check_rating_range CHECK (rating >= 1 AND rating <= 5)
);

-- Helpful FK indexes (not in the Alembic baseline; pure read-performance wins for the admin
-- dashboard, "my orders", product pages and the cart).
CREATE INDEX idx_orders_user_created    ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status          ON orders (status);
CREATE INDEX idx_order_items_order      ON order_items (order_id);
CREATE INDEX idx_order_items_product    ON order_items (product_id);
CREATE INDEX idx_products_category      ON products (category_id);
CREATE INDEX idx_cart_items_cart        ON cart_items (cart_id);
CREATE INDEX idx_reviews_product        ON reviews (product_id);

-- ───────────────────────────── alembic baseline ─────────────────────────────
CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('20b260ce7382');

RESET ROLE;
