import pytest
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--start-maximized")
    service = ChromeService()
    driver = webdriver.Chrome(service=service, options=options)
    yield driver
    time.sleep(5)  # Garde le navigateur ouvert quelques secondes pour observation
    driver.quit()

def teardown_method(self, method):
    self.driver.quit()

def test_create_product_form(driver):
    wait = WebDriverWait(driver, 20)

    # Connexion admin
    driver.get("http://localhost:3000/admin/login")
    wait.until(EC.presence_of_element_located((By.NAME, "email")))
    driver.find_element(By.NAME, "email").send_keys("chafikdev23@gmail.com")
    driver.find_element(By.NAME, "password").send_keys("Chafikdev23")
    driver.find_element(By.CSS_SELECTOR, ".button > span").click()
    time.sleep(2)

    # Accès à la page de création de produit
    driver.get("http://localhost:3000/admin/products/new")

    # Remplissage des champs principaux
    wait.until(EC.presence_of_element_located((By.ID, "name"))).send_keys("Test Product 2")
    driver.find_element(By.ID, "sku").send_keys(f"SKU{int(time.time())}")
    driver.find_element(By.ID, "price").send_keys("19.99")
    driver.find_element(By.ID, "weight").send_keys("2.5")
    time.sleep(0.5)

    # Sélection de la catégorie via le modal
    driver.find_element(By.CSS_SELECTOR, "div.mt-6.relative a.text-interactive").click()
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "div.modal-wrapper[role='dialog']")))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'div.modal h2.card-title')))
    
    title = driver.find_element(By.CSS_SELECTOR, 'div.modal h2.card-title').text
    assert title == "Select categories"
    
    search_input = driver.find_element(By.CSS_SELECTOR, 'div.modal input[placeholder="Search categories"]')
    assert search_input.is_displayed()

    categories = [
        "💻 Équipement de travail",
        "🎧 Confort & concentration",
        "📘 Ressources & apprentissage"
    ]
    for category in categories:
        assert any(category in el.text for el in driver.find_elements(By.CSS_SELECTOR, 'div.modal h3 span')), \
            f"Catégorie manquante : {category}"

    select_buttons = driver.find_elements(By.CSS_SELECTOR, 'div.modal button.button.secondary')
    assert len(select_buttons) >= 3

    # Sélection d'une catégorie spécifique
    all_rows = driver.find_elements(By.CSS_SELECTOR, 'div.modal .grid.grid-cols-8')
    found = False
    for row in all_rows:
        if "🎧 Confort & concentration" in row.text:
            select_btn = row.find_element(By.CSS_SELECTOR, 'div.modal button.button.secondary')
            select_btn.click()
            found = True
            break
    assert found, "La catégorie 🎧 Confort & concentration n’a pas été trouvée ni sélectionnée"

    wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, 'div.modal')))

    # Sélection de la classe de taxe
    tax_class_dropdown = driver.find_element(By.ID, "tax_class")
    for option in tax_class_dropdown.find_elements(By.TAG_NAME, "option"):
        if option.get_attribute("value") == "1":
            option.click()
            break
    time.sleep(0.5)

        # Téléchargement de l'image
    upload_input = driver.find_element(By.CSS_SELECTOR, 'div.uploader input[type="file"]')
    assert not upload_input.is_displayed()
    driver.execute_script("arguments[0].classList.remove('invisible')", upload_input)
    image_path = os.path.abspath("/Users/chafik/Desktop/evershop/tests/test-images/test-new-product.jpg")
    file_input = driver.find_element(By.CSS_SELECTOR, 'div.uploader input[type="file"]')
    driver.execute_script("arguments[0].classList.remove('invisible')", file_input)
    file_input.send_keys(image_path)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "img")))
    
    # Vérification de l'image téléchargée
    uploaded_image = driver.find_element(By.CSS_SELECTOR, "img")
    assert uploaded_image.is_displayed(), "L'image téléchargée n'est pas visible"
    
    # Remplissage des champs SEO
    driver.find_element(By.ID, "urlKey").send_keys(f"test-product-{int(time.time())}")
    driver.find_element(By.ID, "metaTitle").send_keys("Test Meta Title")
    driver.find_element(By.ID, "metaKeywords").send_keys("test,product,meta")
    driver.find_element(By.ID, "meta_description").send_keys("This is a meta description for the test product.")
    time.sleep(0.5)
    
    # Configuration des options radio
    driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, ".radio-unchecked"))
    driver.execute_script("arguments[0].click();", driver.find_element(By.ID, "visibility0"))
    driver.execute_script("arguments[0].click();", driver.find_element(By.ID, "manage_stock0"))
    driver.execute_script("arguments[0].click();", driver.find_element(By.ID, "stock_availability0"))
    time.sleep(0.5)

    # Définir la quantité
    driver.find_element(By.ID, "qty").send_keys("100")

    # Sélection d’attributs produit
    driver.find_element(By.ID, "group_id").click()
    driver.find_element(By.ID, "attributes[0][value]").click()
    color_select = Select(driver.find_element(By.ID, "attributes[0][value]"))
    color_select.select_by_visible_text("Black")

    wait.until(EC.presence_of_element_located((By.ID, "attributes[1][value]")))
    driver.find_element(By.ID, "attributes[1][value]").click()
    size_select = Select(driver.find_element(By.ID, "attributes[1][value]"))
    size_select.select_by_visible_text("XL")

    # Soumission du formulaire
    driver.find_element(By.ID, "productForm").submit()

    # Vérification de la redirection ou succès
    wait.until(EC.url_contains("/admin/products"))
    assert "/admin/products" in driver.current_url or "success" in driver.page_source.lower()
