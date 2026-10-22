"""WebDriver UI checks (complements the Playwright suite).

    cd tests/selenium && pip install -r requirements.txt && pytest -v
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from pages import ADMIN, LoginPage, Navbar


def test_login_page_renders(driver, wait, base_url):
    page = LoginPage(driver, wait, base_url).open()
    assert page.heading() == "Welcome Back"


def test_admin_login_then_logout(driver, wait, base_url):
    LoginPage(driver, wait, base_url).open().sign_in(*ADMIN)
    nav = Navbar(driver, wait)
    nav.logout_button().click()
    nav.login_link()


def test_wrong_password_stays_on_login(driver, wait, base_url):
    LoginPage(driver, wait, base_url).open().sign_in(ADMIN[0], "not-the-password")
    wait.until(lambda d: "login" in d.current_url.lower())
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Login failed') or contains(text(),'nvalid') or contains(text(),'redentials')]")))


def test_products_page_lists_demo_catalogue(driver, wait, base_url):
    driver.get(f"{base_url}/products")
    wait.until(EC.visibility_of_element_located((By.XPATH, "//h1[normalize-space()='Our Products']")))
    wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(),'Wireless Headphones')]")))


def test_product_search_filters_results(driver, wait, base_url):
    driver.get(f"{base_url}/products")
    box = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder='Search products...']")))
    box.send_keys("Kettle")
    wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(),'Stainless Steel Kettle')]")))
    assert not driver.find_elements(By.XPATH, "//*[contains(text(),'Air Fryer 4L')]")


def test_unknown_route_redirects_home(driver, wait, base_url):
    driver.get(f"{base_url}/definitely-not-a-page")
    wait.until(lambda d: d.current_url.rstrip("/") == base_url)
