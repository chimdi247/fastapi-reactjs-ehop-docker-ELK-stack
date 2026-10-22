"""Page objects. The storefront has no test ids, so we use labels / placeholders / visible text."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

ADMIN = ("chimdi247@gmail.com", "password123")


class LoginPage:
    def __init__(self, driver, wait, base):
        self.d, self.w, self.base = driver, wait, base

    def open(self):
        self.d.get(f"{self.base}/login")
        self.w.until(EC.visibility_of_element_located((By.ID, "email")))
        return self

    def sign_in(self, email, password):
        self.d.find_element(By.ID, "email").send_keys(email)
        self.d.find_element(By.ID, "password").send_keys(password)
        self.d.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

    def heading(self):
        return self.d.find_element(By.TAG_NAME, "h1").text


class Navbar:
    def __init__(self, driver, wait):
        self.d, self.w = driver, wait

    def logout_button(self):
        return self.w.until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Logout']")))

    def login_link(self):
        return self.w.until(EC.visibility_of_element_located((By.LINK_TEXT, "Login")))
