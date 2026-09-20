import { products } from '../data/products.data.js';
import { showToast } from './ui.js';

const FREE_SHIPPING_LIMIT = 15000;
const SHIPPING_PRICES = {
    courier: 1990,
    parcel: 990,
    pickup: 0
};

let cart = [];
let selectedShipping = 'courier';

try {
    const savedCart = localStorage.getItem("miklomez_cart");
    if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) cart = parsed;
    }
} catch (error) {
    cart = [];
}

export function getCart() {
    return cart;
}

export function getSelectedShippingMethod() {
    return selectedShipping;
}

export function clearCart() {
    cart = [];
    try {
        localStorage.removeItem("miklomez_cart");
    } catch (e) {
        console.error(e);
    }
    renderCart();
}

export function initCalculatorAndCart() {
    const select = document.getElementById("productSelect");
    const qtyInput = document.getElementById("productQty");
    const addBtn = document.getElementById("addProductBtn");
    const calcOptionsRow = document.getElementById("calcOptionsRow");

    const pillPrice250 = document.getElementById("pillPrice250");
    const pillPrice500 = document.getElementById("pillPrice500");
    const pillPrice900 = document.getElementById("pillPrice900");

    if (!addBtn || !select || !qtyInput) return;

    function updatePillPrices() {
        const pIndex = select.value;
        if (pIndex === "" || isNaN(pIndex)) return;

        const prod = products[pIndex];
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

        const prod = products[pIndex];
        const selectedSizeRadio = document.querySelector('input[name="jarSize"]:checked');
        const jarSize = selectedSizeRadio ? selectedSizeRadio.value : "900g";

        const itemPrice = prod.arak[jarSize] || prod.arak["900g"];
        const itemKey = `${prod.id}_${jarSize}`;
        const itemLabel = `${prod.cim} (${jarSize}-os üveg)`;

        const existingIndex = cart.findIndex((i) => i.key === itemKey);
        if (existingIndex > -1) {
            cart[existingIndex].qty += qty;
        } else {
            cart.push({
                id: prod.id,
                size: jarSize,
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

    // Szállítási opciók változásának figyelése
    document.querySelectorAll('input[name="shippingMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedShipping = e.target.value;
            renderCart();
        });
    });

    renderCart();
}

export function renderCart() {
    const cartContainer = document.getElementById("cartContainer");
    const cartList = document.getElementById("cartList");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartShippingFee = document.getElementById("cartShippingFee");
    const cartTotal = document.getElementById("cartTotal");

    // Jelvények és lebegő elemek
    const headerBadge = document.getElementById("headerCartBadge");
    const floatingBtn = document.getElementById("floatingCartBtn");
    const floatingCount = document.getElementById("floatingCartCount");
    const floatingTotal = document.getElementById("floatingCartTotal");

    // Ingyenes szállítás csík
    const freeShippingText = document.getElementById("freeShippingText");
    const freeShippingProgress = document.getElementById("freeShippingProgress");
    const courierPriceEl = document.getElementById("shippingPriceCourier");
    const parcelPriceEl = document.getElementById("shippingPriceParcel");

    try {
        localStorage.setItem("miklomez_cart", JSON.stringify(cart));
    } catch (e) {
        console.error(e);
    }

    const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (headerBadge) headerBadge.textContent = totalItemCount;

    if (cart.length === 0) {
        if (cartContainer) cartContainer.style.display = "none";
        if (floatingBtn) floatingBtn.style.display = "none";
        return;
    }

    if (cartContainer) cartContainer.style.display = "block";
    if (floatingBtn) floatingBtn.style.display = "flex";
    if (cartList) cartList.innerHTML = "";

    let subtotal = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
      <div class="cart-item-name">
        <span>${item.cim}</span>
      </div>
      <div class="cart-item-actions">
        <div class="cart-item-qty-actions">
          <button type="button" class="cart-qty-btn cart-qty-minus" data-index="${index}" aria-label="Csökkentés">-</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button type="button" class="cart-qty-btn cart-qty-plus" data-index="${index}" aria-label="Növelés">+</button>
        </div>
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

    // Ingyenes szállítás kalkuláció
    const isFree = subtotal >= FREE_SHIPPING_LIMIT;
    const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_LIMIT) * 100));

    if (freeShippingProgress) freeShippingProgress.style.width = `${progressPercent}%`;
    if (freeShippingText) {
        if (isFree) {
            freeShippingText.innerHTML = "🎉 Gratulálunk! Elérte az <strong>ingyenes házhozszállítást</strong>!";
        } else {
            const diff = FREE_SHIPPING_LIMIT - subtotal;
            freeShippingText.innerHTML = `Még <strong>${diff.toLocaleString('hu-HU')} Ft</strong> az ingyenes szállításhoz!`;
        }
    }

    // Szállítási opciók árainak frissítése a felületen
    if (courierPriceEl) courierPriceEl.textContent = isFree ? "INGYENES" : "1 990 Ft";
    if (parcelPriceEl) parcelPriceEl.textContent = isFree ? "INGYENES" : "990 Ft";

    // Kiválasztott szállítási díj kiszámítása
    let shippingFee = SHIPPING_PRICES[selectedShipping] || 0;
    if (isFree || selectedShipping === 'pickup') {
        shippingFee = 0;
    }

    const finalTotal = subtotal + shippingFee;

    if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toLocaleString('hu-HU')} Ft`;
    if (cartShippingFee) cartShippingFee.textContent = shippingFee === 0 ? "Ingyenes" : `${shippingFee.toLocaleString('hu-HU')} Ft`;
    if (cartTotal) cartTotal.textContent = `${finalTotal.toLocaleString('hu-HU')} Ft`;

    if (floatingCount) floatingCount.textContent = `${totalItemCount} db méz`;
    if (floatingTotal) floatingTotal.textContent = `${finalTotal.toLocaleString('hu-HU')} Ft`;

    // Kosár tételléptető és törlés gombok eseménykezelői
    document.querySelectorAll(".cart-qty-minus").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            if (cart[idx].qty > 1) {
                cart[idx].qty -= 1;
            } else {
                cart.splice(idx, 1);
            }
            renderCart();
        });
    });

    document.querySelectorAll(".cart-qty-plus").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            cart[idx].qty += 1;
            renderCart();
        });
    });

    document.querySelectorAll(".cart-item-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            cart.splice(index, 1);
            renderCart();
        });
    });
}

export function initQtyButtons() {
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

export function initCustomerTypeToggle() {
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