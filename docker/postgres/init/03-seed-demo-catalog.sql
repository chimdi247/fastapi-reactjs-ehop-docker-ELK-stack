-- =====================================================================
-- 03 — Demo catalogue (DEV CONVENIENCE — delete this file for an empty shop)
-- Gives the storefront, the Playwright/Selenium suites and the k6 load tests something to work with.
-- =====================================================================
INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Phones, audio, wearables and accessories'),
    ('Home & Kitchen', 'Appliances and everyday essentials'),
    ('Books', 'Technology, fiction and self-improvement'),
    ('Fashion', 'Clothing, shoes and bags')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, stock_quantity, category_id)
SELECT p.name, p.description, p.price, p.stock, c.id
FROM (VALUES
    ('Wireless Headphones',  'Over-ear Bluetooth headphones with 30h battery',  89.99, 500, 'Electronics'),
    ('Smart Watch',          'Fitness tracking, heart-rate and GPS',           149.00, 300, 'Electronics'),
    ('Portable Speaker',     'Waterproof 20W Bluetooth speaker',                59.50, 400, 'Electronics'),
    ('Air Fryer 4L',         'Rapid-air technology, digital controls',         119.00, 250, 'Home & Kitchen'),
    ('Stainless Steel Kettle','1.7L fast-boil electric kettle',                 34.90, 600, 'Home & Kitchen'),
    ('Clean Architecture',   'A craftsman''s guide to software structure',      32.00, 800, 'Books'),
    ('Designing Data-Intensive Applications', 'The big ideas behind reliable systems', 45.00, 700, 'Books'),
    ('Running Shoes',        'Lightweight daily trainers',                      79.00, 350, 'Fashion'),
    ('Canvas Backpack',      '25L water-resistant backpack',                    49.99, 450, 'Fashion')
) AS p(name, description, price, stock, category)
JOIN categories c ON c.name = p.category;
