import { products } from '../data/products.data.js';
import { showToast, initCardGlow } from './ui.js';

export function loadHoneyProducts() {
    const productsGrid = document.getElementById("productsGrid");
    if (!productsGrid) return;

    productsGrid.innerHTML = "";

    products.forEach((product, index) => {
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

function initCardInteractions() {
    document.querySelectorAll(".card[data-product-index]").forEach((card) => {
        const productIndex = parseInt(card.getAttribute("data-product-index"), 10);
        const product = products[productIndex];
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

    showToast(`Kiválasztva: ${products[productIndex].cim} (${size}). Adja hozzá a rendeléshez!`, "success");
}

export function populateProductSelect() {
    const select = document.getElementById("productSelect");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Válasszon mézfajtát...</option>';

    products.forEach((product, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        const p900 = product.arak["900g"] || 0;
        opt.textContent = `${product.cim} (900g: ${p900.toLocaleString('hu-HU')} Ft)`;
        select.appendChild(opt);
    });
}

export function initProductSearch() {
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