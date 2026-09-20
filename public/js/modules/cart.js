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

export function addItemToCart(productIndex, size = "900g", qty = 1) {
    const prod = products[productIndex];
    if (!prod) return;

    const itemPrice = prod.arak[size] || prod.arak["900g"];
    const itemKey = `${prod.id}_${size}`;
    const itemLabel = `${prod.cim} (${size}-os üveg)`;

    const existingIndex = cart.findIndex((i) => i.key === itemKey);
    if (existingIndex > -1) {
        cart[existingIndex].qty += qty;
    } else {
        cart.push({
            id: prod.id,
            size: size,
            key: itemKey,
            cim: itemLabel,
            price: itemPrice,
            qty: qty,
            unit: "db"
        });
    }

    showToast(`"${itemLabel}" hozzáadva a kosárhoz!`, "success");
    renderCart();
}

export function initCalculatorAndCart() {
    document.querySelectorAll('input[name="shippingMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedShipping = e.target.value;
            renderCart();
        });
    });

    renderCart();
}

export function renderCart() {
    const emptyCartState = document.getElementById("emptyCartState");
    const cartContainer = document.getElementById("cartContainer");
    const cartList = document.getElementById("cartList");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartShippingFee = document.getElementById("cartShippingFee");
    const cartTotal = document.getElementById("cartTotal");

    const headerBadge = document.getElementById("headerCartBadge");
    const floatingBtn = document.getElementById("floatingCartBtn");
    const floatingCount = document.getElementById("floatingCartCount");
    const floatingTotal = document.getElementById("floatingCartTotal");

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
        if (emptyCartState) emptyCartState.style.display = "block";
        if (cartContainer) cartContainer.style.display = "none";
        if (floatingBtn) floatingBtn.style.display = "none";
        if (freeShippingProgress) freeShippingProgress.style.width = "0%";
        if (freeShippingText) freeShippingText.innerHTML = "Még 15 000 Ft az ingyenes szállításhoz!";
        return;
    }

    if (emptyCartState) emptyCartState.style.display = "none";
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
          </svg>
        </button>
      </div>
    `;
        cartList.appendChild(li);
    });

    const isFree = subtotal >= FREE_SHIPPING_LIMIT;
    const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_LIMIT) * 100));

    if (freeShippingProgress) freeShippingProgress.style.width = `${progressPercent}%`;
    if (freeShippingText) {
        if (isFree) {
            freeShippingText.innerHTML = "🎉 Elérte az <strong>ingyenes házhozszállítást</strong>!";
        } else {
            const diff = FREE_SHIPPING_LIMIT - subtotal;
            freeShippingText.innerHTML = `Még <strong>${diff.toLocaleString('hu-HU')} Ft</strong> az ingyenes szállításhoz!`;
        }
    }

    if (courierPriceEl) courierPriceEl.textContent = isFree ? "Ingyenes" : "1 990 Ft";
    if (parcelPriceEl) parcelPriceEl.textContent = isFree ? "Ingyenes" : "990 Ft";

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

    // Eseménykezelők
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