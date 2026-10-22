import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


@pytest.fixture()
def driver():
    """Headless Chrome (HEADED=1 to watch). Selenium Manager downloads the matching driver."""
    opts = Options()
    if os.getenv("HEADED") != "1":
        opts.add_argument("--headless=new")
    for a in ("--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,900"):
        opts.add_argument(a)
    d = webdriver.Chrome(options=opts)
    yield d
    d.quit()


@pytest.fixture()
def wait(driver):
    return WebDriverWait(driver, 20)


@pytest.fixture()
def base_url():
    return BASE_URL
