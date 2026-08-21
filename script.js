// Globális állapotok
let loadedProducts = [];
let cart = [];

// Biztonságos betöltés localStorage-ból
try {
  const savedCart = localStorage.getItem("miveskaptar_cart");
  if (savedCart) {
    const parsed = JSON.parse(savedCart);
    if (Array.isArray(parsed)) {
      cart = parsed;
    }
  }
} catch (error) {
  console.error("Hiba a mentett kosár betöltésekor:", error);
  cart = [];
}

// Segédfüggvény árszövegek / számok egységes feldolgozására
function parsePrice(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return parseInt(String(val).replace(/[^0-9]/g, ""), 10) || 0;
}

// Tartalék termékkészlet (ha a gist épp nem érhető el)
const fallbackProducts = [
  {
    cim: "Napraforgó méz",
    arak: { 0.8: 2310, 0.9: 2600, 1.0: 2890 },
    discountPercentage: 0,
    isSale: false,
    nagy_tetel_ar: "2000 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  },
  {
    cim: "Akácméz",
    arak: { 0.8: 2100, 0.9: 2360, 1.0: 2625 },
    origArak: { 0.8: 2800, 0.9: 3150, 1.0: 3500 },
    discountPercentage: 25,
    isSale: true,
    nagy_tetel_ar: "2750 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  },
  {
    cim: "Repceméz",
    arak: { 0.8: 2000, 0.9: 2250, 1.0: 2500 },
    discountPercentage: 0,
    isSale: false,
    nagy_tetel_ar: "1900 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  initAmbientPollen();
  initInteractiveBee();
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

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/**
 * Lebegő virágpor háttér
 */
function initAmbientPollen() {
  const container = document.getElementById("ambientParticles");
  if (!container) return;

  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 10 : 20;

  for (let i = 0; i < particleCount; i++) {
    const pollen = document.createElement("div");
    pollen.className = "pollen";

    const size = Math.random() * 6 + 3;
    const left = Math.random() * 100;
    const duration = Math.random() * 14 + 14;
    const delay = Math.random() * -25;
    const drift = Math.random() * 60 - 30;
    const opacity = Math.random() * 0.35 + 0.15;

    pollen.style.width = `${size}px`;
    pollen.style.height = `${size}px`;
    pollen.style.left = `${left}%`;
    pollen.style.setProperty("--duration", `${duration}s`);
    pollen.style.setProperty("--drift", `${drift}px`);
    pollen.style.setProperty("--opacity", opacity);
    pollen.style.animationDelay = `${delay}s`;

    container.appendChild(pollen);
  }
}

/**
 * Lebegő interaktív méhecske fizika
 */
function initInteractiveBee() {
  const bee = document.querySelector('.hero-bee-container');
  const hero = document.querySelector('.hero');
  if (!bee || !hero) return;

  bee.style.transition = 'none';

  let currentX = 0, currentY = 0;
  let vx = 0, vy = 0;
  let currentAngleDeg = 0;
  let mouseX = -9999, mouseY = -9999;
  let isMouseNear = false;
  let targetTravelX = 0, targetTravelY = 0;
  let isAutoTraveling = false;
  let homeX = 0, homeY = 0;
  let heroWidth = 0, heroHeight = 0;

  function calculateLayout() {
    const heroRect = hero.getBoundingClientRect();
    heroWidth = heroRect.width;
    heroHeight = heroRect.height;
    bee.style.transform = 'none';
    const beeRect = bee.getBoundingClientRect();
    homeX = (beeRect.left + beeRect.width / 2) - heroRect.left;
    homeY = (beeRect.top + beeRect.height / 2) - heroRect.top;
    bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
  }

  calculateLayout();
  window.addEventListener('resize', calculateLayout);

  const updateMouseCoords = (e) => {
    const rect = hero.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
    isMouseNear = true;
  };

  hero.addEventListener('mousemove', updateMouseCoords, { passive: true });
  hero.addEventListener('mouseleave', () => { isMouseNear = false; });

  bee.addEventListener('click', (e) => {
    e.preventDefault();
    const padding = 40;
    const targetAbsX = padding + Math.random() * (heroWidth - 2 * padding);
    const targetAbsY = padding + Math.random() * (heroHeight - 2 * padding);
    targetTravelX = targetAbsX - homeX;
    targetTravelY = targetAbsY - homeY;
    isAutoTraveling = true;
  });

  function updatePhysics() {
    const beeCenterX = homeX + currentX;
    const beeCenterY = homeY + currentY;
    const dx = beeCenterX - mouseX;
    const dy = beeCenterY - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const proximity = 140;
    const pushStrength = 3.5;
    const friction = 0.88;

    if (isAutoTraveling) {
      const tx = targetTravelX - currentX;
      const ty = targetTravelY - currentY;
      const tdist = Math.sqrt(tx * tx + ty * ty);

      if (tdist < 15) {
        isAutoTraveling = false;
      } else {
        let fx = tx * 0.06;
        let fy = ty * 0.06;
        const fdist = Math.sqrt(fx * fx + fy * fy);
        if (fdist > 6.0) {
          fx = (fx / fdist) * 6.0;
          fy = (fy / fdist) * 6.0;
        }
        vx += fx;
        vy += fy;
      }
    } else if (isMouseNear && dist < proximity) {
      const force = (proximity - dist) / proximity;
      if (dist > 0.1) {
        vx += (dx / dist) * force * pushStrength;
        vy += (dy / dist) * force * pushStrength;
      }
    }

    vx *= friction;
    vy *= friction;
    currentX += vx;
    currentY += vy;

    const speed = Math.sqrt(vx * vx + vy * vy);
    let targetAngle = currentAngleDeg;
    if (speed > 0.4) {
      targetAngle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
    }

    let angleDiff = targetAngle - currentAngleDeg;
    while (angleDiff < -180) angleDiff += 360;
    while (angleDiff > 180) angleDiff -= 360;
    currentAngleDeg += angleDiff * 0.12;

    const padding = 35;
    let absoluteX = homeX + currentX;
    let absoluteY = homeY + currentY;

    if (absoluteX < padding) { absoluteX = padding; vx = 0; }
    else if (absoluteX > heroWidth - padding) { absoluteX = heroWidth - padding; vx = 0; }

    if (absoluteY < padding) { absoluteY = padding; vy = 0; }
    else if (absoluteY > heroHeight - padding) { absoluteY = heroHeight - padding; vy = 0; }

    currentX = absoluteX - homeX;
    currentY = absoluteY - homeY;

    bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
    requestAnimationFrame(updatePhysics);
  }

  requestAnimationFrame(updatePhysics);
}

/**
 * Scroll Reveal
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * Mobil Menü
 */
function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");
  if (!hamburger || !menu) return;

  const toggle = (open) => {
    const isOpen = open !== undefined ? open : !menu.classList.contains("open");
    menu.classList.toggle("open", isOpen);
    hamburger.classList.toggle("active", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  };

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.addEventListener("click", () => toggle(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) {
      toggle(false);
    }
  });

  document.addEventListener("click", (e) => {
    if (menu.classList.contains("open") && !menu.contains(e.target) && !hamburger.contains(e.target)) {
      toggle(false);
    }
  });
}

function initHeaderScroll() {
  const header = document.querySelector(".main-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });
}

/**
 * Termékek betöltése a Gist-ből és pontos üvegárak feldolgozása
 */
async function loadHoneyProducts() {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) return;

  const gistUrl = "https://gist.githubusercontent.com/LinkRiderWP/72c14d567b414c98c494fb32d6ea2c41/raw/mezajanlat.json";

  try {
    const response = await fetch(gistUrl);
    if (!response.ok) throw new Error(`Hiba: ${response.status}`);

    const rawData = await response.text();
    const products = JSON.parse(rawData);

    productsGrid.innerHTML = "";
    loadedProducts = [];

    products.forEach((product, index) => {
      if (!product.kep || !product.cim || !product.leiras) return;

      const discountPercentage = parseInt(product.kedvezmeny, 10) || 0;
      const isSale = discountPercentage > 0;

      let orig08 = 0, orig09 = 0, orig10 = 0;

      if (product.arak) {
        orig08 = parsePrice(product.arak["0.8"] || product.arak["800g"]);
        orig09 = parsePrice(product.arak["0.9"] || product.arak["900g"]);
        orig10 = parsePrice(product.arak["1.0"] || product.arak["1kg"] || product.arak["1"]);
      }

      if (!orig10) orig10 = parsePrice(product.ar) || 2800;
      if (!orig08) orig08 = Math.round((orig10 * 0.8) / 10) * 10;
      if (!orig09) orig09 = Math.round((orig10 * 0.9) / 10) * 10;

      const final08 = isSale ? Math.round((orig08 * (1 - discountPercentage / 100)) / 10) * 10 : orig08;
      const final09 = isSale ? Math.round((orig09 * (1 - discountPercentage / 100)) / 10) * 10 : orig09;
      const final10 = isSale ? Math.round((orig10 * (1 - discountPercentage / 100)) / 10) * 10 : orig10;

      loadedProducts.push({
        cim: product.cim,
        isSale: isSale,
        discountPercentage: discountPercentage,
        origArak: { 0.8: orig08, 0.9: orig09, 1.0: orig10 },
        arak: { 0.8: final08, 0.9: final09, 1.0: final10 },
        nagy_tetel_ar: product.nagy_tetel_ar || null,
        nagy_tetel_minimum: product.nagy_tetel_minimum || null
      });

      let bulkPriceHtml = "";
      if (product.nagy_tetel_ar && product.nagy_tetel_minimum) {
        bulkPriceHtml = `
          <div class="bulk-price-box">
            <span class="bulk-icon">📦</span>
            <span class="bulk-text">Nagy tételben: <strong>${product.nagy_tetel_ar}</strong> (${product.nagy_tetel_minimum})</span>
          </div>
        `;
      }

      const card = document.createElement("article");
      card.className = `card ${isSale ? 'is-sale' : ''}`;
      card.style.animationDelay = `${index * 0.05}s`;
      card.setAttribute("data-product-index", index);

      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${product.kep}" alt="${product.cim}" loading="lazy" />
          ${isSale ? `<span class="floating-badge-sale">-${discountPercentage}% AKCIÓ</span>` : ""}
        </div>
        <div class="card-content">
          <h3>${product.cim}</h3>
          <p>${product.leiras}</p>

          <div class="card-size-selector-box">
            <span class="card-size-label">Válasszon üvegméretet:</span>
            <div class="card-size-buttons">
              <button type="button" class="card-size-btn" data-size="0.8">0.8 kg</button>
              <button type="button" class="card-size-btn" data-size="0.9">0.9 kg</button>
              <button type="button" class="card-size-btn active" data-size="1.0">1.0 kg</button>
            </div>
          </div>

          <div class="price-row">
            <div class="price-container">
              <span class="price-sub">Kiválasztott ár:</span>
              ${isSale ? `<span class="original-price card-orig-price">${orig10.toLocaleString('hu-HU')} Ft</span>` : ""}
              <span class="price card-display-price">${final10.toLocaleString('hu-HU')} Ft</span>
            </div>
            <button type="button" class="btn-card-order" data-index="${index}" data-size="1.0" aria-label="${product.cim} megrendelése">
              <span>Megrendelem</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>

          ${bulkPriceHtml}
        </div>
      `;

      productsGrid.appendChild(card);
    });

    void productsGrid.offsetWidth;
    productsGrid.classList.add("loaded");

    initCardInteractions();
    populateProductSelect();
    initCardGlow();

  } catch (error) {
    console.warn("Külső JSON nem tölthető be, tartalék adatok használata:", error);
    loadedProducts = fallbackProducts;
    populateProductSelect();
  }
}

/**
 * Kártyákon belüli méretváltás eseménykezelői
 */
function initCardInteractions() {
  document.querySelectorAll(".card[data-product-index]").forEach((card) => {
    const productIndex = parseInt(card.getAttribute("data-product-index"), 10);
    const product = loadedProducts[productIndex];
    if (!product) return;

    const sizeBtns = card.querySelectorAll(".card-size-btn");
    const displayPrice = card.querySelector(".card-display-price");
    const origDisplayPrice = card.querySelector(".card-orig-price");
    const orderBtn = card.querySelector(".btn-card-order");

    let currentSelectedSize = 1.0;

    sizeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sizeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentSelectedSize = parseFloat(btn.getAttribute("data-size"));
        const newPrice = product.arak[currentSelectedSize] || product.arak[1.0];
        displayPrice.textContent = `${newPrice.toLocaleString('hu-HU')} Ft`;

        if (origDisplayPrice && product.isSale) {
          const newOrigPrice = product.origArak[currentSelectedSize] || product.origArak[1.0];
          origDisplayPrice.textContent = `${newOrigPrice.toLocaleString('hu-HU')} Ft`;
        }

        if (orderBtn) {
          orderBtn.setAttribute("data-size", currentSelectedSize);
        }
      });
    });

    if (orderBtn) {
      orderBtn.addEventListener("click", () => {
        selectProductAndScrollToOrder(productIndex, currentSelectedSize);
      });
    }
  });
}

/**
 * Megrendelem gomb: kalkulátor kitöltése és finom leugrás
 */
function selectProductAndScrollToOrder(productIndex, size) {
  const select = document.getElementById("productSelect");
  const calcOptionsRow = document.getElementById("calcOptionsRow");
  const jarSizeContainer = document.getElementById("jarSizeContainer");
  const bulkMinInfo = document.getElementById("bulkMinInfo");
  const calcBox = document.getElementById("orderCalculatorBox");

  if (!select) return;

  select.value = productIndex;
  select.dispatchEvent(new Event("change"));

  const jarRadio = document.querySelector('input[name="calcUnit"][value="jar"]');
  if (jarRadio) {
    jarRadio.checked = true;
    jarRadio.dispatchEvent(new Event("change"));
  }

  const sizeRadio = document.querySelector(`input[name="jarSize"][value="${size.toFixed(1)}"]`);
  if (sizeRadio) {
    sizeRadio.checked = true;
    sizeRadio.dispatchEvent(new Event("change"));
  }

  if (calcOptionsRow) calcOptionsRow.style.display = "flex";
  if (jarSizeContainer) jarSizeContainer.style.display = "block";
  if (bulkMinInfo) bulkMinInfo.style.display = "none";

  if (calcBox) {
    const yOffset = -90;
    const y = calcBox.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });

    calcBox.classList.add("highlight-pulse");
    setTimeout(() => {
      calcBox.classList.remove("highlight-pulse");
    }, 1800);
  }

  showToast(`Kiválasztva: ${loadedProducts[productIndex].cim} (${size} kg). Adja hozzá a rendeléshez!`, "success");
}

function populateProductSelect() {
  const select = document.getElementById("productSelect");
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Válasszon mézfajtát...</option>';

  loadedProducts.forEach((product, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    const p10 = product.arak[1.0] || 0;
    opt.textContent = `${product.cim} (1 kg: ${p10.toLocaleString('hu-HU')} Ft)`;
    select.appendChild(opt);
  });
}

/**
 * Kalkulátor és Kosár Kezelése
 */
function initCalculatorAndPreview() {
  const select = document.getElementById("productSelect");
  const qtyInput = document.getElementById("productQty");
  const qtyLabel = document.getElementById("qtyLabel");
  const addBtn = document.getElementById("addProductBtn");
  const cartContainer = document.getElementById("cartContainer");
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");
  const previewBox = document.getElementById("emailPreviewBox");
  const previewContent = document.getElementById("emailPreviewContent");

  const calcOptionsRow = document.getElementById("calcOptionsRow");
  const jarSizeContainer = document.getElementById("jarSizeContainer");
  const bulkRadioWrapper = document.getElementById("bulkRadioWrapper");
  const labelPriceKg = document.getElementById("labelPriceKg");
  const bulkMinInfo = document.getElementById("bulkMinInfo");

  const pillPrice08 = document.getElementById("pillPrice08");
  const pillPrice09 = document.getElementById("pillPrice09");
  const pillPrice10 = document.getElementById("pillPrice10");

  if (!addBtn || !select || !qtyInput) return;

  function updatePillPrices() {
    const pIndex = select.value;
    if (pIndex === "" || isNaN(pIndex)) return;

    const prod = loadedProducts[pIndex];
    if (!prod || !prod.arak) return;

    if (pillPrice08) pillPrice08.textContent = `${prod.arak[0.8].toLocaleString('hu-HU')} Ft`;
    if (pillPrice09) pillPrice09.textContent = `${prod.arak[0.9].toLocaleString('hu-HU')} Ft`;
    if (pillPrice10) pillPrice10.textContent = `${prod.arak[1.0].toLocaleString('hu-HU')} Ft`;
  }

  select.addEventListener("change", () => {
    const pIndex = select.value;
    if (pIndex === "" || isNaN(pIndex)) return;

    const prod = loadedProducts[pIndex];
    calcOptionsRow.style.display = "flex";

    updatePillPrices();

    if (prod.nagy_tetel_ar && prod.nagy_tetel_minimum) {
      bulkRadioWrapper.style.display = "flex";
      labelPriceKg.textContent = `Lédig nagy tétel (${prod.nagy_tetel_ar})`;
      bulkMinInfo.textContent = `* Megjegyzés: Lédig rendelésnél a minimális mennyiség: ${prod.nagy_tetel_minimum}.`;
    } else {
      bulkRadioWrapper.style.display = "none";
      const defaultJarRadio = document.querySelector('input[name="calcUnit"][value="jar"]');
      if (defaultJarRadio) defaultJarRadio.checked = true;
      jarSizeContainer.style.display = "block";
      bulkMinInfo.style.display = "none";
      qtyLabel.textContent = "Mennyiség (db)";
    }
  });

  document.querySelectorAll('input[name="calcUnit"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "jar") {
        jarSizeContainer.style.display = "block";
        bulkMinInfo.style.display = "none";
        qtyLabel.textContent = "Mennyiség (db)";
      } else {
        jarSizeContainer.style.display = "none";
        bulkMinInfo.style.display = "block";
        qtyLabel.textContent = "Mennyiség (kg)";
      }
    });
  });

  // Hozzáadás a kosárhoz
  addBtn.addEventListener("click", () => {
    const pIndex = select.value;
    const qty = parseInt(qtyInput.value, 10);

    if (pIndex === "" || isNaN(pIndex)) {
      showToast("Kérjük, válasszon ki egy mézfajtát!", "warning");
      return;
    }

    if (isNaN(qty) || qty < 1) {
      showToast("Kérjük, érvényes mennyiséget adjon meg!", "warning");
      return;
    }

    const prod = loadedProducts[pIndex];
    const unitTypeEl = document.querySelector('input[name="calcUnit"]:checked');
    const unitType = unitTypeEl ? unitTypeEl.value : "jar";

    let itemKey = "";
    let itemLabel = "";
    let itemPrice = 0;
    let unitName = "db";

    if (unitType === "jar") {
      const selectedSizeRadio = document.querySelector('input[name="jarSize"]:checked');
      const jarWeight = parseFloat(selectedSizeRadio ? selectedSizeRadio.value : "1.0");

      itemPrice = prod.arak[jarWeight] || prod.arak[1.0];
      itemKey = `${prod.cim}_jar_${jarWeight}`;
      itemLabel = `${prod.cim} (${jarWeight} kg-os üveg)`;
      unitName = "db";
    } else {
      if (!prod.nagy_tetel_ar) {
        showToast("Ebből a mézből nem érhető el lédig kiszerelés!", "error");
        return;
      }

      itemPrice = parsePrice(prod.nagy_tetel_ar);
      const minKg = parsePrice(prod.nagy_tetel_minimum) || 10;

      if (qty < minKg) {
        showToast(`Lédig kiszerelés esetén a minimális rendelés ${minKg} kg!`, "warning");
        return;
      }

      itemKey = `${prod.cim}_bulk_kg`;
      itemLabel = `${prod.cim} (Lédig nagy tétel)`;
      unitName = "kg";
    }

    const existingIndex = cart.findIndex((i) => i.key === itemKey);
    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        key: itemKey,
        cim: itemLabel,
        price: itemPrice,
        qty: qty,
        unit: unitName
      });
    }

    showToast(`"${itemLabel}" hozzáadva a rendeléshez!`, "success");

    select.value = "";
    qtyInput.value = 1;
    calcOptionsRow.style.display = "none";
    const jarRadio = document.querySelector('input[name="calcUnit"][value="jar"]');
    if (jarRadio) jarRadio.checked = true;
    const defaultSize = document.querySelector('input[name="jarSize"][value="1.0"]');
    if (defaultSize) defaultSize.checked = true;
    jarSizeContainer.style.display = "block";
    bulkMinInfo.style.display = "none";
    qtyLabel.textContent = "Mennyiség (db)";

    renderCart();
  });

  function renderCart() {
    try {
      localStorage.setItem("miveskaptar_cart", JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }

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
        <div class="cart-item-name">
          <span>${item.cim} &times; ${item.qty} ${item.unit} (${item.price.toLocaleString('hu-HU')} Ft/${item.unit})</span>
        </div>
        <div class="cart-item-actions">
          <strong>${itemTotal.toLocaleString('hu-HU')} Ft</strong>
          <button type="button" class="cart-item-remove" data-index="${index}" aria-label="Eltávolítás" title="Eltávolítás">
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

    cartTotal.textContent = `${total.toLocaleString('hu-HU')} Ft`;

    document.querySelectorAll(".cart-item-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.getAttribute("data-index"), 10);
        cart.splice(index, 1);
        renderCart();
      });
    });

    updateEmailPreview();
  }

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
      cart.forEach((item) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        orderLines += `- ${item.cim}: ${item.qty} ${item.unit} × ${item.price.toLocaleString('hu-HU')} Ft = ${itemTotal.toLocaleString('hu-HU')} Ft\n`;
      });
      orderLines += `---------------------------\n`;
      orderLines += `Várható végösszeg: ${total.toLocaleString('hu-HU')} Ft\n\n`;
    } else {
      orderLines += `(Nincs kiválasztott termék a kosárban)\n\n`;
    }

    const template = `Feladó: ${name || "[Név]"} (${email || "[E-mail cím]"})
Telefon: ${phone || "[Telefonszám]"}
Kiszállítási cím: ${address || "[Cím]"}

${orderLines}Megjegyzés:
${message || "[Nincs megjegyzés fűzve a rendeléshez]"}`;

    previewContent.textContent = template;
  }

  ["name", "email", "phone", "address", "message"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      const saved = localStorage.getItem(`miveskaptar_field_${id}`);
      if (saved) input.value = saved;

      input.addEventListener("input", () => {
        localStorage.setItem(`miveskaptar_field_${id}`, input.value);
        updateEmailPreview();
      });
    }
  });

  window.resetCart = () => {
    cart = [];
    renderCart();
  };

  renderCart();
}

/**
 * Űrlap beküldése Web3Forms-on keresztül
 */
function initContactForm() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  const submitBtn = document.getElementById("submitBtn");
  const previewContent = document.getElementById("emailPreviewContent");
  const formattedOrderInput = document.getElementById("formattedOrder");

  if (!form || !feedback || !submitBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const addressInput = document.getElementById("address");

    const nameParts = nameInput.value.trim().split(/\s+/);
    if (nameParts.length < 2) {
      showToast("Kérjük, adja meg teljes nevét (Vezetéknév és Keresztnév)!", "warning");
      nameInput.focus();
      return;
    }

    const cleanPhone = phoneInput.value.trim().replace(/[\s\-()]/g, "");
    const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;

    if (!huPhoneRegex.test(cleanPhone)) {
      showToast("Kérjük, érvényes magyar telefonszámot adjon meg!", "warning");
      phoneInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showToast("Kérjük, érvényes e-mail címet adjon meg!", "warning");
      emailInput.focus();
      return;
    }

    if (addressInput.value.trim().length < 8) {
      showToast("Kérjük, pontosabb szállítási címet adjon meg!", "warning");
      addressInput.focus();
      return;
    }

    if (cart.length === 0) {
      showToast("A kosara még üres! Válasszon legalább egy terméket.", "warning");
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Megrendelés küldése...";
    submitBtn.disabled = true;

    if (formattedOrderInput && previewContent) {
      formattedOrderInput.value = previewContent.textContent;
    }

    const formData = new FormData(form);
    formData.append("access_key", "00846189-84b3-41ba-87e4-7ddb4e42f20c");
    formData.append("subject", `Míves Kaptár - Új megrendelés: ${formData.get("name")}`);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        feedback.textContent = "Köszönjük a megrendelést! Hamarosan keresni fogjuk a személyes kiszállítás egyeztetése miatt.";
        feedback.className = "form-feedback success";

        form.reset();

        ["name", "email", "phone", "address", "message"].forEach((id) => {
          localStorage.removeItem(`miveskaptar_field_${id}`);
        });

        if (typeof window.resetCart === "function") {
          window.resetCart();
        }
      } else {
        throw new Error(result.message || "Hiba a küldéskor.");
      }

    } catch (error) {
      console.error("Küldési hiba:", error);
      feedback.textContent = "Sajnos hiba történt a beküldés során. Kérjük, keressen minket telefonon!";
      feedback.className = "form-feedback error";
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      setTimeout(() => {
        feedback.style.opacity = "0";
        setTimeout(() => {
          feedback.textContent = "";
          feedback.className = "form-feedback";
          feedback.style.opacity = "";
        }, 400);
      }, 8000);
    }
  });
}

/**
 * Vissza a tetejére gomb
 */
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 350);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/**
 * Navigációs figyelő
 */
function initActiveNavObserver() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".menu .nav-link");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: "-80px 0px 0px 0px" });

  sections.forEach((s) => observer.observe(s));
}

/**
 * Accordion
 */
function initAccordion() {
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isActive = item.classList.contains("active-item");

      document.querySelectorAll(".accordion-item").forEach((other) => {
        other.classList.remove("active-item");
        const btn = other.querySelector(".accordion-header");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });

      if (!isActive) {
        item.classList.add("active-item");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/**
 * Spotlight fény effekt (csak asztali gépeken aktiválódik)
 */
function initCardGlow() {
  if (!window.matchMedia("(hover: hover)").matches) return;

  const elements = document.querySelectorAll(".card, .value-card, .accordion-item, .info-card, .contact-form-wrapper, .order-calculator-box, .email-preview-box");

  elements.forEach((el) => {
    let ticking = false;
    el.addEventListener("mousemove", (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  });
}

/**
 * Toast értesítések
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
  void toast.offsetHeight;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 4000);
}

/**
 * Mennyiségléptető gombok (+ / -)
 */
function initQtyButtons() {
  const minusBtn = document.querySelector(".qty-minus");
  const plusBtn = document.querySelector(".qty-plus");
  const qtyInput = document.getElementById("productQty");

  if (!minusBtn || !plusBtn || !qtyInput) return;

  minusBtn.addEventListener("click", () => {
    const val = parseInt(qtyInput.value, 10) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });

  plusBtn.addEventListener("click", () => {
    const val = parseInt(qtyInput.value, 10) || 1;
    qtyInput.value = val + 1;
  });

  qtyInput.addEventListener("keydown", (e) => {
    if (["e", "E", "-", "+", ".", ","].includes(e.key)) e.preventDefault();
  });

  qtyInput.addEventListener("blur", () => {
    let parsed = parseInt(qtyInput.value, 10);
    if (isNaN(parsed) || parsed < 1) qtyInput.value = 1;
  });
}