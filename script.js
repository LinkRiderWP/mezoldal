// Globális változók a termékinformációk és kosár kezelésére
let loadedProducts = [];
let cart = [];

// Megpróbáljuk betölteni a korábban elmentett kosarat a böngészőből
try {
  cart = JSON.parse(localStorage.getItem("miveskaptar_cart")) || [];
} catch (error) {
  console.error("Hiba a mentett kosár betöltésekor, üres kosár indítása:", error);
  cart = [];
}

// Fallback (tartalék) termékkészlet, ha a külső JSON nem tölthető be
const fallbackProducts = [
  { cim: "Akácméz", calculatedPrice: 3400, arText: "3400 Ft/üveg", nagy_tetel_ar: "3000 Ft/kg", nagy_tetel_minimum: "10 kg" },
  { cim: "Hársméz", calculatedPrice: 3100, arText: "3100 Ft/üveg", nagy_tetel_ar: "2700 Ft/kg", nagy_tetel_minimum: "10 kg" },
  { cim: "Vegyes virágméz", calculatedPrice: 2500, arText: "2500 Ft/üveg" }
];

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initMobileMenu();
  initHeaderScroll();
  loadHoneyProducts();
  initContactForm();
  initBackToTop();
  initActiveNavObserver();
  initAccordion(); 
  initCardGlow();  
  initCalculatorAndPreview();
  initQtyButtons();
});

/**
 * Scroll Reveal Animáció (Intersection Observer API)
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  const observerOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
}

/**
 * Mobil navigációs menü kezelése és háttérgörgetés tiltása
 */
function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  if (hamburger && menu) {
    hamburger.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      hamburger.classList.toggle("active");
      document.body.classList.toggle("menu-open", isOpen);
    });

    document.querySelectorAll(".menu a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        hamburger.classList.remove("active");
        document.body.classList.remove("menu-open");
      });
    });
  }
}

/**
 * Fejléc zsugorítása görgetéskor
 */
function initHeaderScroll() {
  const header = document.querySelector(".main-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

/**
 * Termékek lekérése a GitHub-ról + Hibakezelés újratöltés gombbal
 */
async function loadHoneyProducts() {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) return;

  const gistUrl = "https://gist.githubusercontent.com/LinkRiderWP/72c14d567b414c98c494fb32d6ea2c41/raw/mezajanlat.json";

  try {
    const response = await fetch(gistUrl);
    if (!response.ok) throw new Error(`Hálózati hiba történt: ${response.status}`);

    const rawData = await response.text();
    const products = JSON.parse(rawData);

    productsGrid.innerHTML = "";
    productsGrid.classList.remove("loaded"); // Tiszta állapot az animációhoz
    loadedProducts = []; 

    products.forEach((product, index) => {
      if (!product.kep || !product.cim || !product.leiras || !product.ar) {
        console.warn(`⚠️ Hiányos adat a(z) ${index + 1}. terméknél:`, product);
        return;
      }

      // Árak és Kedvezmény meghatározása
      const originalPriceText = product.ar;
      const discountPercentage = parseInt(product.kedvezmeny) || 0;
      const isSale = discountPercentage > 0;
      
      let displayPriceHtml = "";
      let calculatedPriceText = originalPriceText;
      let calculatedPrice = parseInt(originalPriceText.replace(/[^0-9]/g, "")) || 0;

      if (isSale) {
        calculatedPrice = Math.round(calculatedPrice * (1 - discountPercentage / 100));
        calculatedPriceText = `${calculatedPrice} Ft / üveg`;
        
        displayPriceHtml = `
          <div class="price-container">
            <span class="original-price">${originalPriceText}</span>
            <span class="price">${calculatedPriceText}</span>
          </div>
        `;
      } else {
        displayPriceHtml = `
          <div class="price-container">
            <span class="price">${originalPriceText}</span>
          </div>
        `;
      }

      // Eltároljuk a globális tömbben a későbbi kalkulátorhoz
      loadedProducts.push({
        cim: product.cim,
        calculatedPrice: calculatedPrice,
        arText: calculatedPriceText,
        nagy_tetel_ar: product.nagy_tetel_ar || null,
        nagy_tetel_minimum: product.nagy_tetel_minimum || null
      });

      // Nagy tételes ajánlat generálása
      let bulkPriceHtml = "";
      if (product.nagy_tetel_ar && product.nagy_tetel_minimum) {
        bulkPriceHtml = `
          <div class="bulk-price-box">
            <span class="bulk-icon">📦</span>
            <span class="bulk-text">Nagy tételben: <strong>${product.nagy_tetel_ar}</strong> (${product.nagy_tetel_minimum})</span>
          </div>
        `;
      }

      // Kártya összeállítása
      const card = document.createElement("article");
      card.className = `card ${isSale ? 'is-sale' : ''}`;
      // Hullámszerűen beúszó bekezdéshez az animációs és átmenet-késleltetések
      card.style.animationDelay = `${index * 0.05}s`;
      card.style.transitionDelay = `${index * 0.05}s`;

      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${product.kep}" alt="${product.cim}" loading="lazy" />
          ${isSale ? `<span class="floating-badge-sale">-${discountPercentage}% AKCIÓ</span>` : ""}
        </div>
        <div class="card-content">
          <h3>${product.cim}</h3>
          <p>${product.leiras}</p>
          <div class="price-row">
            ${displayPriceHtml}
          </div>
          ${bulkPriceHtml}
        </div>
      `;

      productsGrid.appendChild(card);
    });

    // Indítjuk az áttűnést
    void productsGrid.offsetWidth; // Force reflow
    productsGrid.classList.add("loaded");

    // Sikeres betöltés után feltöltjük a kalkulátor választóját
    populateProductSelect();
    initCardGlow();

  } catch (error) {
    console.error("❌ Nem sikerült a termékek betöltése:", error);
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <p style="margin-bottom: 1rem;">Sajnos jelenleg nem értük el az online katalógust, a megrendelést ettől függetlenül alább leadhatja.</p>
        <button type="button" onclick="location.reload()" class="btn-primary" style="padding: 0.6rem 1.5rem; font-size: 0.85rem;">Próbálja újra</button>
      </div>
    `;
    
    // Betöltjük a fallback termékeket hiba esetén
    loadedProducts = fallbackProducts;
    populateProductSelect();
  }
}

/**
 * Termékválasztó legördülő menü feltöltése
 */
function populateProductSelect() {
  const select = document.getElementById("productSelect");
  if (!select) return;

  // Töröljük a placeholderen kívüli opciókat
  select.innerHTML = '<option value="" disabled selected>Válasszon mézfajtát...</option>';

  loadedProducts.forEach((product, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = `${product.cim} (${product.arText})`;
    select.appendChild(opt);
  });
}

/**
 * Kalkulátor, Kosár és Live E-mail előnézet kezelése
 */
function initCalculatorAndPreview() {
  const select = document.getElementById("productSelect");
  const qtyInput = document.getElementById("productQty");
  const addBtn = document.getElementById("addProductBtn");
  const cartContainer = document.getElementById("cartContainer");
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");
  const previewBox = document.getElementById("emailPreviewBox");
  const previewContent = document.getElementById("emailPreviewContent");

  // Dinamikus opciók (db vs kg) elemei
  const calcOptionsRow = document.getElementById("calcOptionsRow");
  const labelPriceDb = document.getElementById("labelPriceDb");
  const labelPriceKg = document.getElementById("labelPriceKg");
  const bulkMinInfo = document.getElementById("bulkMinInfo");

  if (!addBtn || !select || !qtyInput) return;

  // Ha megváltozik a kiválasztott méz, ellenőrizzük, van-e nagy tételes lédig opciója
  select.addEventListener("change", () => {
    const productIndex = select.value;
    if (productIndex === "" || isNaN(productIndex)) return;

    const selectedProduct = loadedProducts[productIndex];

    if (selectedProduct.nagy_tetel_ar && selectedProduct.nagy_tetel_minimum) {
      // Frissítjük a kiszerelés-választó feliratait az árakkal
      labelPriceDb.textContent = `Üveges kiszerelés (db) — ${selectedProduct.arText}`;
      labelPriceKg.textContent = `Lédig nagy tétel (kg) — ${selectedProduct.nagy_tetel_ar}`;
      bulkMinInfo.textContent = `* Megjegyzés: Lédig (kg) rendelése esetén a minimális rendelési mennyiség: ${selectedProduct.nagy_tetel_minimum}.`;
      
      // Megjelenítjük a választót
      calcOptionsRow.style.display = "flex";
    } else {
      // Elrejtjük és visszaállítjuk darabra, ha a kiválasztott mézből nincs lédig opció
      calcOptionsRow.style.display = "none";
      document.querySelector('input[name="calcUnit"][value="db"]').checked = true;
    }
  });

  // Termék hozzáadása a kosárhoz
  addBtn.addEventListener("click", () => {
    const productIndex = select.value;
    const qty = parseInt(qtyInput.value);

    if (productIndex === "" || isNaN(productIndex)) {
      showToast("Kérjük, válasszon ki egy mézfajtát a listából!", "warning");
      return;
    }

    if (isNaN(qty) || qty < 1) {
      showToast("Kérjük, érvényes mennyiséget adjon meg (legalább 1)!", "warning");
      return;
    }

    const selectedProduct = loadedProducts[productIndex];
    const unitType = document.querySelector('input[name="calcUnit"]:checked').value; // "db" vagy "kg"

    let finalPrice = selectedProduct.calculatedPrice;
    
    // Ha lédig (kg) opciót választott
    if (unitType === "kg") {
      if (selectedProduct.nagy_tetel_ar) {
        finalPrice = parseInt(selectedProduct.nagy_tetel_ar.replace(/[^0-9]/g, "")) || selectedProduct.calculatedPrice;
        
        // Ellenőrizzük a minimum rendelési mennyiséget kg-ban
        const minQtyNeeded = parseInt(selectedProduct.nagy_tetel_minimum.replace(/[^0-9]/g, "")) || 10;
        if (qty < minQtyNeeded) {
          showToast(`Lédig kiszerelés esetén a minimális rendelhető mennyiség ebből a mézből ${minQtyNeeded} kg!`, "warning");
          return;
        }
      } else {
        showToast("Ebből a termékből sajnos nem érhető el lédig kiszerelés.", "error");
        return;
      }
    }

    // Egyedi kulcsot képezünk a kosárban, hogy az üveges és lédig verziók külön sorba kerülhessenek
    const cartKey = `${selectedProduct.cim}_${unitType}`;
    const existingIndex = cart.findIndex(item => item.key === cartKey);

    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        key: cartKey,
        cim: selectedProduct.cim,
        price: finalPrice,
        qty: qty,
        unit: unitType // "db" vagy "kg"
      });
    }

    // Sikeres hozzáadás visszajelzés
    showToast(`"${selectedProduct.cim}" sikeresen hozzáadva a kosárhoz!`, "success");

    // Alaphelyzetbe állítás
    select.value = "";
    qtyInput.value = 1;
    calcOptionsRow.style.display = "none";
    document.querySelector('input[name="calcUnit"][value="db"]').checked = true;

    renderCart();
  });

  // Kosár renderelése és frissítése
  function renderCart() {
    localStorage.setItem("miveskaptar_cart", JSON.stringify(cart));

    if (cart.length === 0) {
      cartContainer.style.display = "none";
      updateEmailPreview();
      return;
    }

    cartContainer.style.display = "block";
    cartList.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;

      const li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML = `
        <span>${item.cim} &times; ${item.qty} ${item.unit} (${item.price} Ft/${item.unit})</span>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <strong>${itemTotal} Ft</strong>
          <button type="button" class="cart-item-remove" data-index="${index}" aria-label="${item.cim} eltávolítása a kosárból" title="Eltávolítás a kosárból">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;
      cartList.appendChild(li);
    });

    cartTotal.textContent = `${total} Ft`;

    // Eltávolító gombok eseménykezelői (e.currentTarget-tel az SVG kattintásbiztonságért)
    document.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const btnElement = e.currentTarget;
        const index = parseInt(btnElement.getAttribute("data-index"));
        cart.splice(index, 1);
        renderCart();
      });
    });

    updateEmailPreview();
  }

  // Dinamikus e-mail előnézet összeállítása
  function updateEmailPreview() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const message = document.getElementById("message").value.trim();

    const hasInputs = name || email || phone || address || message;

    if (cart.length === 0 && !hasInputs) {
      previewBox.style.display = "none";
      return;
    }

    previewBox.style.display = "block";

    let orderLines = "";
    let total = 0;

    if (cart.length > 0) {
      orderLines += `--- MEGRENDELT TERMÉKEK ---\n`;
      cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        orderLines += `- ${item.cim}: ${item.qty} ${item.unit} x ${item.price} Ft (${itemTotal} Ft)\n`;
      });
      orderLines += `---------------------------\n`;
      orderLines += `Várható végösszeg: ${total} Ft\n\n`;
    } else {
      orderLines += `(Nincs még kiválasztott termék)\n\n`;
    }

    const template = `Feladó: ${name || "[Név]"} (${email || "[E-mail cím]"})
Telefon: ${phone || "[Telefonszám]"}
Kiszállítási cím: ${address || "[Cím]"}

${orderLines}Megjegyzés / Kérések:
${message || "[Nincs egyedi megjegyzés fűzve az üzenethez]"}`;

    previewContent.textContent = template;
  }

  // Input figyelők a dinamikus frissítéshez, mentéshez és betöltéshez
  const previewInputs = ["name", "email", "phone", "address", "message"];
  previewInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      // 1. Adatok betöltése a böngésző memóriájából oldalbetöltéskor
      const savedValue = localStorage.getItem(`miveskaptar_field_${id}`);
      if (savedValue !== null) {
        input.value = savedValue;
      }

      // 2. Mentés és e-mail előnézet frissítése gépeléskor
      input.addEventListener("input", () => {
        localStorage.setItem(`miveskaptar_field_${id}`, input.value);
        updateEmailPreview();
      });
    }
  });

  // Globálissá tesszük a kosár-resetet a form beküldéséhez
  window.resetCart = () => {
    cart = [];
    renderCart();
  };

  renderCart();
}

/**
 * Kapcsolatfelvételi űrlap valódi e-mail küldéssel (Web3Forms API) + Szigorú beviteli ellenőrzések
 */
function initContactForm() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  const submitBtn = document.getElementById("submitBtn");
  const previewContent = document.getElementById("emailPreviewContent");
  const formattedOrderInput = document.getElementById("formattedOrder");

  if (form && feedback && submitBtn) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // --- SZIGORÚ ADATELLENŐRZÉSEK (VALIDATION) ---
      const nameInput = document.getElementById("name");
      const emailInput = document.getElementById("email");
      const phoneInput = document.getElementById("phone");
      const addressInput = document.getElementById("address");

      // 1. Név ellenőrzése (legalább Családnév + Utónév kell)
      const nameParts = nameInput.value.trim().split(/\s+/);
      if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        showToast("Kérjük, adja meg a teljes nevét (Családnév és Utónév)!", "warning");
        nameInput.focus();
        return;
      }

      // 2. Telefonszám ellenőrzése (Magyar vezetékes és mobil formátumok)
      // Megengedünk szóközöket, kötőjeleket, de a tiszta számnak meg kell felelnie a mintának
      const cleanPhone = phoneInput.value.trim().replace(/[\s\-()]/g, "");
      const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;

      if (!huPhoneRegex.test(cleanPhone)) {
        showToast("Kérjük, érvényes magyar telefonszámot adjon meg (+36... vagy 06... formátumban)!", "warning");
        phoneInput.focus();
        return;
      }

      // 3. E-mail ellenőrzése (Alapszintű szintaktikai teszt)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value.trim())) {
        showToast("Kérjük, érvényes e-mail címet adjon meg!", "warning");
        emailInput.focus();
        return;
      }

      // 4. Szállítási cím ellenőrzése (ne legyen túl rövid, pl. csak a város neve)
      if (addressInput.value.trim().length < 10) {
        showToast("Kérjük, pontosabb szállítási címet adjon meg (város, utca, házszám)!", "warning");
        addressInput.focus();
        return;
      }

      // 5. Kosár ürességének ellenőrzése
      if (cart.length === 0) {
        showToast("A kosara üres! Kérjük, válasszon ki legalább egy mézfajtát a rendelés összeállításánál.", "warning");
        return;
      }

      // --- SIKERES ELLENŐRZÉS UTÁN INDUL A KÜLDÉS ---
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = "Megrendelés küldése...";
      submitBtn.disabled = true;

      // 1. Frissítjük a rejtett mezőt a formázott rendelési adatokkal az e-mail előnézetből
      if (formattedOrderInput && previewContent) {
        formattedOrderInput.value = previewContent.textContent;
      }

      // 2. Összekészítjük a küldendő adatokat
      const formData = new FormData(form);
      
      // Access Key:
      formData.append("access_key", "00846189-84b3-41ba-87e4-7ddb4e42f20c"); 
      
      // Opcionális: Az e-mail tárgyának testreszabása
      formData.append("subject", `Míves Kaptár - Új megrendelés tőle: ${formData.get("name")}`);

      try {
        // 3. Elküldjük az adatokat az API-nak
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Sikeres küldés
          feedback.textContent = "Köszönjük a megrendelést! Telefonszámán hamarosan keresni fogjuk a személyes kiszállítás egyeztetése miatt.";
          feedback.className = "form-feedback success";
          
          form.reset();

          // SIKERES KÜLDÉS UTÁN KIÜRÍTJÜK A MENTETT MEZŐKET IS
          const fieldsToClear = ["name", "email", "phone", "address", "message"];
          fieldsToClear.forEach(id => {
            localStorage.removeItem(`miveskaptar_field_${id}`);
          });

          // Kosár ürítése és előnézet elrejtése
          if (typeof window.resetCart === "function") {
            window.resetCart();
          }
        } else {
          throw new Error(result.message || "Hiba történt a küldés során.");
        }

      } catch (error) {
        console.error("Küldési hiba:", error);
        feedback.textContent = "Sajnos hiba történt a küldés során. Kérjük, próbálja meg újra, vagy hívjon minket telefonon!";
        feedback.className = "form-feedback error";
        feedback.style.color = "var(--accent-color)";
        feedback.style.fontWeight = "600";
      } finally {
        // Visszaállítjuk a gombot
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;

        // Visszajelzés elrejtése pár másodperc múlva
        setTimeout(() => {
          feedback.style.opacity = "0";
          setTimeout(() => {
            feedback.textContent = "";
            feedback.className = "form-feedback";
            feedback.style.opacity = "";
            feedback.style.color = "";
          }, 400);
        }, 8000);
      }
    });
  }
}

/**
 * Vissza a tetejére gomb logikája
 */
function initBackToTop() {
  const backToTopBtn = document.getElementById("backToTop");
  if (!backToTopBtn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/**
 * Aktív menüpont megjelölése a fejlécben görgetés közben (Intersection Observer)
 */
function initActiveNavObserver() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".menu .nav-link");

  const observerOptions = {
    root: null,
    threshold: 0.5,
    rootMargin: "-80px 0px 0px 0px"
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute("id");
        
        navLinks.forEach((link) => {
          if (link.getAttribute("href") === `#${activeId}`) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    navObserver.observe(section);
  });
}

/**
 * Mézkalauz Harmonika (Accordion) Kezelése
 */
function initAccordion() {
  const headers = document.querySelectorAll(".accordion-header");
  
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isCurrentlyActive = item.classList.contains("active-item");

      document.querySelectorAll(".accordion-item").forEach((otherItem) => {
        otherItem.classList.remove("active-item");
        otherItem.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
      });

      if (!isCurrentlyActive) {
        item.classList.add("active-item");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/**
 * Kártyák interaktív fény-derengése (Spotlight Effect)
 */
function initCardGlow() {
  if (window.matchMedia("(hover: hover)").matches) {
    const glowElements = document.querySelectorAll(
      ".card, .value-card, .accordion-item, .info-card, .contact-form-wrapper, .order-calculator-box, .email-preview-box"
    );
    glowElements.forEach((element) => {
      element.addEventListener("mousemove", (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        element.style.setProperty("--mouse-x", `${x}px`);
        element.style.setProperty("--mouse-y", `${y}px`);
      });
    });
  }
}

/**
 * Egyedi, animált értesítések (Toast) megjelenítése
 * @param {string} message - A megjelenítendő üzenet
 * @param {string} type - 'warning', 'error', vagy 'success'
 */
function showToast(message, type = "warning") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "⚠️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  toast.offsetHeight;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 4500);
}

/**
 * Egyedi mennyiség-léptető gombok (+ / -) kezelése és szigorú korlátozása
 */
function initQtyButtons() {
  const container = document.querySelector(".qty-control");
  if (!container) return;

  const minusBtn = container.querySelector(".qty-minus");
  const plusBtn = container.querySelector(".qty-plus");
  const qtyInput = container.querySelector("#productQty");

  if (minusBtn && plusBtn && qtyInput) {
    // Csökkentő gomb kezelése
    minusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentValue = parseInt(qtyInput.value) || 1;
      if (currentValue > 1) {
        qtyInput.value = currentValue - 1;
        qtyInput.dispatchEvent(new Event("input"));
      }
    });

    // Növelő gomb kezelése
    plusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentValue = parseInt(qtyInput.value) || 1;
      qtyInput.value = currentValue + 1;
      qtyInput.dispatchEvent(new Event("input"));
    });

    // Gépelés korlátozása
    qtyInput.addEventListener("keydown", (e) => {
      if (["e", "E", "-", "+", ".", ","].includes(e.key)) {
        e.preventDefault();
      }
    });

    // Amikor kilép a mezőből (blur), ellenőrizzük, hogy érvényes-e a szám
    qtyInput.addEventListener("blur", () => {
      let parsed = parseInt(qtyInput.value);
      if (isNaN(parsed) || parsed < 1) {
        qtyInput.value = 1;
        qtyInput.dispatchEvent(new Event("input"));
        showToast("A mennyiségnek legalább 1-nek kell lennie!", "warning");
      } else {
        qtyInput.value = Math.floor(parsed); // Biztosan egész szám marad
      }
    });
  }
}