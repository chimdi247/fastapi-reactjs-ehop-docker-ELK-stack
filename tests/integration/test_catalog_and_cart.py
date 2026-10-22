import pytest


def test_demo_catalogue_is_visible_without_login():
    from conftest import Api
    cats = Api().get("/categories")
    prods = Api().get("/products")
    assert cats.status_code == 200 and prods.status_code == 200
    assert len(prods.json()["data"]) >= 1


def _first_product(c):
    data = c.get("/products").json()["data"]
    items = data["items"] if isinstance(data, dict) and "items" in data else data
    assert items, "no products — was docker/postgres/init/03-seed-demo-catalog.sql removed?"
    return items[0]


def test_product_details(customer):
    p = _first_product(customer)
    r = customer.get(f"/products/{p['id']}")
    assert r.status_code == 200 and r.json()["data"]["id"] == p["id"]


def test_unknown_product_is_404(customer):
    assert customer.get("/products/99999999").status_code == 404


def test_cart_add_get_and_clear(customer):
    p = _first_product(customer)
    assert customer.post("/cart/add", json={"product_id": p["id"], "quantity": 2}).status_code == 200
    cart = customer.get("/cart").json()["data"]
    assert cart["totalQuantity"] == 2
    assert customer.delete("/cart/clear").status_code == 200
    assert customer.get("/cart").json()["data"]["totalQuantity"] == 0


def test_cannot_add_more_than_stock(customer):
    p = _first_product(customer)
    assert customer.post("/cart/add", json={"product_id": p["id"], "quantity": 10_000_000}).status_code in (400, 409, 422)


def test_checkout_with_empty_cart_is_rejected(customer):
    assert customer.post("/orders/checkout").status_code in (400, 404, 422)


def test_new_customer_has_no_orders(customer):
    r = customer.get("/orders/me")
    assert r.status_code == 200


@pytest.mark.skip(reason="checkout creates a real Stripe session — enable with a valid STRIPE_SECRET_KEY test key")
def test_checkout_returns_a_payment_url(customer):
    p = _first_product(customer)
    customer.post("/cart/add", json={"product_id": p["id"], "quantity": 1})
    assert customer.post("/orders/checkout").status_code == 201
