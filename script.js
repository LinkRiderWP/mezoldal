// ==========================================
// GLOBÁLIS ÁLLAPOTOK ÉS KOSÁR INICIALIZÁLÁS
// ==========================================
let loadedProducts = [];
let cart = [];

// Biztonságos betöltés localStorage-ból
try {
  const savedCart = localStorage.getItem("miklomez_cart");
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

// Termékkészlet pontos árakkal, helyi képekkel és nagytétel árakkal
const fallbackProducts = [
  {
    cim: "Napraforgó méz",
    leiras: "Intenzív aranysárga színű, gazdag ízvilágú különlegesség, amely kristályos textúrájával, klasszikus ízével tökéletes választás reggelikhez, teák ízesítéséhez és süteményekhez.",
    kep: "kepek/mez.jpg",
    arak: { "250g": 990, "500g": 1790, "900g": 2890 },
    discountPercentage: 0,
    isSale: false,
    nagy_tetel_ar: "2000 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  },
  {
    cim: "Akácméz",
    leiras: "Világos színű, lágy ízű mézkülönlegesség, amely hosszan megőrzi folyékony állagát – tökéletes választás mindennapi édesítéshez vagy akár ajándékba is.",
    kep: "kepek/akacmez.jpg",
    arak: { "250g": 1890, "500g": 2590, "900g": 3500 },
    discountPercentage: 25,
    isSale: true,
    nagy_tetel_ar: "2750 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  },
  {
    cim: "Repceméz",
    leiras: "Krémes állagú, enyhén fanyar ízű méz, amely finomszemcsésen kristályosodik – kiváló választás reggelihez, pirítósra kenve vagy teába keverve.",
    kep: "kepek/repcemez.jpg",
    arak: { "250g": 1190, "500g": 1990, "900g": 2500 },
    discountPercentage: 0,
    isSale: false,
    nagy_tetel_ar: "1900 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  },
  {
    cim: "Hársméz",
    leiras: "Erőteljes, rendkívül aromás, fűszeres illatú igazi gyógyító mézkülönlegesség. Természetes nyugtató hatású, megfázásos tünetek enyhítésére és alvászavarok ellen kiváló.",
    kep: "kepek/harsmez.jpg",
    arak: { "250g": 1490, "500g": 2290, "900g": 3100 },
    discountPercentage: 0,
    isSale: false,
    nagy_tetel_ar: "2400 Ft / kg",
    nagy_tetel_minimum: "min. 10 kg"
  }
];

// ==========================================
// DOM READY & FUNKCIÓK INDÍTÁSA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initAmbientPollen();
  initInteractiveBee();
  initScrollReveal();
  initMobileMenu();
  initHeaderScroll();
  loadHoneyProducts();
  initOrderAndSimplePay();
  initBackToTop();
  initActiveNavObserver();
  initAccordion();
  initCardGlow();
  initCalculatorAndCart();
  initQtyButtons();
  initProductSearch();
  initCustomerTypeToggle();
  checkPaymentStatusParams();

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/**
 * 1. SimplePay visszatérés figyelése az URL-ből (?payment=success / ?payment=failed)
 */
function checkPaymentStatusParams() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("payment");
  const alertSuccess = document.getElementById("paymentAlertSuccess");
  const alertFailed = document.getElementById("paymentAlertFailed");

  if (status === "success") {
    if (alertSuccess) alertSuccess.style.display = "block";
    localStorage.removeItem("miklomez_cart");
    cart = [];
    if (typeof window.renderCartApp === "function") window.renderCartApp();
    showToast("A fizetés sikeres volt! A Billingo e-számlát elküldtük e-mailben.", "success");
  } else if (status === "failed") {
    if (alertFailed) alertFailed.style.display = "block";
    showToast("A fizetés sikertelen volt. Kérjük próbálja meg újra!", "error");
  }
}

/**
 * 2. Vevő típusa választó (Magánszemély / Céges számla adószámmal)
 */
function initCustomerTypeToggle() {
  const indRadio = document.getElementById("typeIndividual");
  const compRadio = document.getElementById("typeCompany");
  const compFields = document.getElementById("companyFields");
  const nameLabel = document.getElementById("nameLabel");
  const compNameInput = document.getElementById("companyName");
  const taxInput = document.getElementById("taxNumber");

  if (!indRadio || !compRadio || !compFields) return;

  function updateFields() {
    const isComp = compRadio.checked;
    compFields.style.display = isComp ? "grid" : "none";
    if (nameLabel) {
      nameLabel.textContent = isComp ? "Kapcsolattartó neve *" : "Teljes Név *";
    }
    if (compNameInput) compNameInput.required = isComp;
    if (taxInput) taxInput.required = isComp;
  }

  indRadio.addEventListener("change", updateFields);
  compRadio.addEventListener("change", updateFields);
}

/**
 * 3. Lebegő virágpor háttéranimáció
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
 * 4. Interaktív fizikai méhecske
 */
function initInteractiveBee() {
  const bee = document.querySelector(".hero-bee-container");
  const hero = document.querySelector(".hero");
  if (!bee || !hero) return;

  bee.style.transition = "none";

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
    bee.style.transform = "none";
    const beeRect = bee.getBoundingClientRect();
    homeX = (beeRect.left + beeRect.width / 2) - heroRect.left;
    homeY = (beeRect.top + beeRect.height / 2) - heroRect.top;
    bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
  }

  calculateLayout();
  window.addEventListener("resize", calculateLayout);

  const updateMouseCoords = (e) => {
    const rect = hero.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
    isMouseNear = true;
  };

  hero.addEventListener("mousemove", updateMouseCoords, { passive: true });
  hero.addEventListener("mouseleave", () => { isMouseNear = false; });

  bee.addEventListener("click", (e) => {
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
 * 5. Görgetésre aktiválódó elemek (Scroll Reveal)
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
 * 6. Mobil Menü Kezelése
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
    if (e.key === "Escape" && menu.classList.contains("open")) toggle(false);
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
 * 7. Termékek betöltése és renderelése
 */
async function loadHoneyProducts() {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) return;

  loadedProducts = fallbackProducts;
  productsGrid.innerHTML = "";

  loadedProducts.forEach((product, index) => {
    const price900 = product.arak["900g"] || 0;
    const bulkPriceText = product.nagy_tetel_ar ? `${product.nagy_tetel_ar} (${product.nagy_tetel_minimum || 'min. 10 kg'})` : "Érdeklődjön e-mailben!";

    const card = document.createElement("article");
    card.className = `card ${product.isSale ? 'is-sale' : ''}`;
    card.style.animationDelay = `${index * 0.05}s`;
    card.setAttribute("data-product-index", index);

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${product.kep}" alt="${product.cim}" loading="lazy" />
        ${product.isSale ? `<span class="floating-badge-sale">AKCIÓ -${product.discountPercentage}%</span>` : ""}
      </div>
      <div class="card-content">
        <h3>${product.cim}</h3>
        <p>${product.leiras}</p>

        <div class="card-size-selector-box">
          <span class="card-size-label">Válasszon üvegméretet:</span>
          <div class="card-size-buttons">
            <button type="button" class="card-size-btn" data-size="250g">250 g</button>
            <button type="button" class="card-size-btn" data-size="500g">500 g</button>
            <button type="button" class="card-size-btn active" data-size="900g">900 g</button>
          </div>
        </div>

        <div class="price-row">
          <div class="price-container">
            <span class="price-sub">Kiválasztott ár:</span>
            <span class="price card-display-price">${price900.toLocaleString('hu-HU')} Ft</span>
          </div>
          <button type="button" class="btn-card-order" data-index="${index}" data-size="900g" aria-label="${product.cim} kosárba tétele">
            <span>Kosárba</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        <div class="bulk-price-box">
          <span class="bulk-icon">📦</span>
          <span class="bulk-text">Nagytétel ár: <strong>${bulkPriceText}</strong></span>
        </div>
      </div>
    `;

    productsGrid.appendChild(card);
  });

  void productsGrid.offsetWidth;
  productsGrid.classList.add("loaded");

  initCardInteractions();
  populateProductSelect();
  initCardGlow();
}

/**
 * 8. Kártyán belüli méretváltások
 */
function initCardInteractions() {
  document.querySelectorAll(".card[data-product-index]").forEach((card) => {
    const productIndex = parseInt(card.getAttribute("data-product-index"), 10);
    const product = loadedProducts[productIndex];
    if (!product) return;

    const sizeBtns = card.querySelectorAll(".card-size-btn");
    const displayPrice = card.querySelector(".card-display-price");
    const orderBtn = card.querySelector(".btn-card-order");

    let currentSelectedSize = "900g";

    sizeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sizeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentSelectedSize = btn.getAttribute("data-size");
        const newPrice = product.arak[currentSelectedSize] || product.arak["900g"];
        displayPrice.textContent = `${newPrice.toLocaleString('hu-HU')} Ft`;

        if (orderBtn) orderBtn.setAttribute("data-size", currentSelectedSize);
      });
    });

    if (orderBtn) {
      orderBtn.addEventListener("click", () => {
        selectProductAndScrollToOrder(productIndex, currentSelectedSize);
      });
    }
  });
}

function selectProductAndScrollToOrder(productIndex, size) {
  const select = document.getElementById("productSelect");
  const calcOptionsRow = document.getElementById("calcOptionsRow");
  const calcBox = document.getElementById("orderCalculatorBox");

  if (!select) return;

  select.value = productIndex;
  select.dispatchEvent(new Event("change"));

  const sizeRadio = document.querySelector(`input[name="jarSize"][value="${size}"]`);
  if (sizeRadio) sizeRadio.checked = true;

  if (calcOptionsRow) calcOptionsRow.style.display = "flex";

  if (calcBox) {
    const yOffset = -90;
    const y = calcBox.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });

    calcBox.classList.add("highlight-pulse");
    setTimeout(() => {
      calcBox.classList.remove("highlight-pulse");
    }, 1800);
  }

  showToast(`Kiválasztva: ${loadedProducts[productIndex].cim} (${size}). Adja hozzá a rendeléshez!`, "success");
}

function populateProductSelect() {
  const select = document.getElementById("productSelect");
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Válasszon mézfajtát...</option>';

  loadedProducts.forEach((product, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    const p900 = product.arak["900g"] || 0;
    opt.textContent = `${product.cim} (900g: ${p900.toLocaleString('hu-HU')} Ft)`;
    select.appendChild(opt);
  });
}

/**
 * 9. Termékkereső szűrés
 */
function initProductSearch() {
  const searchInput = document.getElementById("productSearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const noMatchBox = document.getElementById("noProductMatch");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    if (clearBtn) clearBtn.classList.toggle("active", query.length > 0);

    const cards = document.querySelectorAll("#productsGrid .card");
    let matchCount = 0;

    cards.forEach((card) => {
      const title = card.querySelector("h3") ? card.querySelector("h3").textContent.toLowerCase() : "";
      const text = card.querySelector("p") ? card.querySelector("p").textContent.toLowerCase() : "";
      const isMatch = title.includes(query) || text.includes(query);

      card.style.display = isMatch ? "flex" : "none";
      if (isMatch) matchCount++;
    });

    if (noMatchBox) {
      noMatchBox.style.display = matchCount === 0 ? "block" : "none";
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.classList.remove("active");
      searchInput.dispatchEvent(new Event("input"));
    });
  }
}

/**
 * 10. Kalkulátor és Kosár Logika
 */
function initCalculatorAndCart() {
  const select = document.getElementById("productSelect");
  const qtyInput = document.getElementById("productQty");
  const addBtn = document.getElementById("addProductBtn");
  const cartContainer = document.getElementById("cartContainer");
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");

  const calcOptionsRow = document.getElementById("calcOptionsRow");
  const pillPrice250 = document.getElementById("pillPrice250");
  const pillPrice500 = document.getElementById("pillPrice500");
  const pillPrice900 = document.getElementById("pillPrice900");

  if (!addBtn || !select || !qtyInput) return;

  function updatePillPrices() {
    const pIndex = select.value;
    if (pIndex === "" || isNaN(pIndex)) return;

    const prod = loadedProducts[pIndex];
    if (!prod || !prod.arak) return;

    if (pillPrice250) pillPrice250.textContent = `${(prod.arak["250g"] || 0).toLocaleString('hu-HU')} Ft`;
    if (pillPrice500) pillPrice500.textContent = `${(prod.arak["500g"] || 0).toLocaleString('hu-HU')} Ft`;
    if (pillPrice900) pillPrice900.textContent = `${(prod.arak["900g"] || 0).toLocaleString('hu-HU')} Ft`;
  }

  select.addEventListener("change", () => {
    const pIndex = select.value;
    if (pIndex === "" || isNaN(pIndex)) return;

    calcOptionsRow.style.display = "flex";
    updatePillPrices();
  });

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
    const selectedSizeRadio = document.querySelector('input[name="jarSize"]:checked');
    const jarSize = selectedSizeRadio ? selectedSizeRadio.value : "900g";

    const itemPrice = prod.arak[jarSize] || prod.arak["900g"];
    const itemKey = `${prod.cim}_${jarSize}`;
    const itemLabel = `${prod.cim} (${jarSize}-os üveg)`;

    const existingIndex = cart.findIndex((i) => i.key === itemKey);
    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        key: itemKey,
        cim: itemLabel,
        price: itemPrice,
        qty: qty,
        unit: "db"
      });
    }

    showToast(`"${itemLabel}" hozzáadva a rendeléshez!`, "success");

    select.value = "";
    qtyInput.value = 1;
    calcOptionsRow.style.display = "none";
    const defaultSize = document.querySelector('input[name="jarSize"][value="900g"]');
    if (defaultSize) defaultSize.checked = true;

    renderCart();
  });

  function renderCart() {
    try {
      localStorage.setItem("miklomez_cart", JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }

    if (cart.length === 0) {
      cartContainer.style.display = "none";
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
          <span>${item.cim} &times; ${item.qty} ${item.unit} (${item.price.toLocaleString('hu-HU')} Ft)</span>
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
  }

  window.renderCartApp = renderCart;
  renderCart();
}

/**
 * 11. Megrendelés küldése & SimplePay átirányítás
 */
function initOrderAndSimplePay() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  const submitBtn = document.getElementById("submitBtn");

  if (!form || !feedback || !submitBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast("A kosár üres! Válasszon legalább egy mézet a megrendeléshez.", "warning");
      return;
    }

    const consent = document.getElementById("simplepayConsent");
    if (consent && !consent.checked) {
      showToast("Kérjük, fogadja el az adatkezelési és SimplePay feltételeket!", "warning");
      return;
    }

    const isCompany = document.getElementById("typeCompany").checked;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const zip = document.getElementById("zip").value.trim();
    const city = document.getElementById("city").value.trim();
    const address = document.getElementById("address").value.trim();
    const message = document.getElementById("message").value.trim();
    const companyName = isCompany ? document.getElementById("companyName").value.trim() : "";
    const taxNumber = isCompany ? document.getElementById("taxNumber").value.trim() : "";

    // Név ellenőrzés
    if (name.split(/\s+/).length < 2) {
      showToast("Kérjük, adja meg teljes nevét (Vezetéknév és Keresztnév)!", "warning");
      document.getElementById("name").focus();
      return;
    }

    // Magyar telefonszám validáció
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;
    if (!huPhoneRegex.test(cleanPhone)) {
      showToast("Kérjük, érvényes magyar telefonszámot adjon meg!", "warning");
      document.getElementById("phone").focus();
      return;
    }

    // Irányítószám (4 számjegy) validáció
    if (!/^\d{4}$/.test(zip)) {
      showToast("Kérjük, érvényes 4 számjegyű magyar irányítószámot adjon meg!", "warning");
      document.getElementById("zip").focus();
      return;
    }

    submitBtn.disabled = true;
    const spanText = submitBtn.querySelector("span");
    if (spanText) spanText.textContent = "Átirányítás a SimplePay felületére...";

    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer: {
            name,
            email,
            phone,
            zip,
            city,
            address,
            company: companyName,
            taxNumber: taxNumber
          },
          note: message
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.paymentUrl) {
        // Átirányítás a hivatalos OTP SimplePay fizetési felületre
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.message || "A fizetési kapu nem válaszolt.");
      }

    } catch (err) {
      console.error("SimplePay indítási hiba:", err);
      feedback.textContent = `Hiba a fizetés indításakor: ${err.message}. Kérjük próbálja újra!`;
      feedback.className = "form-feedback error";
      submitBtn.disabled = false;
      if (spanText) spanText.textContent = "Tovább a biztonságos SimplePay fizetéshez";
    }
  });
}

/**
 * 12. Vissza a tetejére gomb
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
 * 13. Navigációs figyelő görgetéskor
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
 * 14. Mézkalauz Harmonika (Accordion)
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
 * 15. Kártya Spotlight Fényeffekt
 */
function initCardGlow() {
  if (!window.matchMedia("(hover: hover)").matches) return;

  const elements = document.querySelectorAll(".card, .value-card, .accordion-item, .info-card, .contact-form-wrapper, .order-calculator-box, .social-box");

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
 * 16. Toast értesítések
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
 * 17. Mennyiségléptető gombok (+ / -)
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