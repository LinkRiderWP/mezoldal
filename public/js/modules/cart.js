import { products } from '../data/products.data.js';
import { showToast } from './ui.js';

// Méz + üveg bruttó súlyok (kg)
const WEIGHT_PER_SIZE = {
    "250g": 0.45,
    "500g": 0.80,
    "900g": 1.35
};
const BOX_BASE_WEIGHT = 0.35; // Doboz és törésbiztos védelem alaptömege

const FREE_SHIPPING_LIMIT = 18000;
const FREE_SHIPPING_MAX_WEIGHT = 10;

// Súlyalapú szállítási díjtáblázat a kliensen
const SHIPPING_CONFIG = {
    courier: {
        name: 'MPL Házhozszállítás',
        maxWeight: 100,
        rates: [
            { maxKg: 2, price: 1990 },
            { maxKg: 5, price: 2490 },
            { maxKg: 10, price: 2990 },
            { maxKg: 20, price: 3990 },
            { maxKg: 30, price: 5490 },
            { maxKg: 999, price: 7990 }
        ]
    },
    parcel: {
        name: 'MPL Csomagautomata / PostaPont',
        maxWeight: 20,
        rates: [
            { maxKg: 2, price: 990 },
            { maxKg: 5, price: 1490 },
            { maxKg: 10, price: 1990 },
            { maxKg: 20, price: 2790 }
        ]
    },
    pickup: {
        name: 'Személyes átvétel (Alföld)',
        maxWeight: 9999,
        rates: [
            { maxKg: 9999, price: 0 }
        ]
    }
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

export function calculateCartWeight() {
    if (cart.length === 0) return 0;
    const itemsWeight = cart.reduce((sum, item) => {
        const unitWeight = WEIGHT_PER_SIZE[item.size] || 1.35;
        return sum + (unitWeight * item.qty);
    }, 0);

    return Math.round((itemsWeight + BOX_BASE_WEIGHT) * 10) / 10;
}

function getTierPrice(methodKey, weightKg) {
    const config = SHIPPING_CONFIG[methodKey];
    if (!config) return 0;
    for (const tier of config.rates) {
        if (weightKg <= tier.maxKg) {
            return tier.price;
        }
    }
    return config.rates[config.rates.length - 1].price;
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

    const cartWeightBadge = document.getElementById("cartTotalWeightBadge");
    const courierPriceEl = document.getElementById("shippingPriceCourier");
    const parcelPriceEl = document.getElementById("shippingPriceParcel");
    const parcelRadio = document.querySelector('input[name="shippingMethod"][value="parcel"]');
    const parcelCard = document.getElementById("shippingCardParcel");
    const parcelWarning = document.getElementById("parcelWeightWarning");

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
        if (freeShippingText) freeShippingText.innerHTML = `Még ${FREE_SHIPPING_LIMIT.toLocaleString('hu-HU')} Ft az ingyenes szállításhoz!`;
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

    // Csomagtömeg kiszámítása
    const totalWeight = calculateCartWeight();
    if (cartWeightBadge) {
        cartWeightBadge.innerHTML = `⚖️ Csomag becsült összsúlya: <strong>${totalWeight} kg</strong> <span class="weight-note">(üvegekkel és törésbiztos csomagolással)</span>`;
    }

    // 20 kg automata korlát ellenőrzése
    const isParcelTooHeavy = totalWeight > SHIPPING_CONFIG.parcel.maxWeight;
    if (parcelRadio && parcelCard) {
        if (isParcelTooHeavy) {
            parcelRadio.disabled = true;
            parcelCard.classList.add("disabled");
            if (parcelWarning) parcelWarning.style.display = "block";

            // Ha az automata volt bejelölve, kényszerített váltás házhozszállításra
            if (selectedShipping === 'parcel') {
                selectedShipping = 'courier';
                const courierRadio = document.querySelector('input[name="shippingMethod"][value="courier"]');
                if (courierRadio) courierRadio.checked = true;
                showToast("A csomag meghaladja a 20 kg-ot, ezért automatikusan házhozszállításra váltottunk!", "warning");
            }
        } else {
            parcelRadio.disabled = false;
            parcelCard.classList.remove("disabled");
            if (parcelWarning) parcelWarning.style.display = "none";
        }
    }

    // Súly szerinti szállítási árak
    let courierBasePrice = getTierPrice('courier', totalWeight);
    let parcelBasePrice = getTierPrice('parcel', totalWeight);

    const isFreeEligible = subtotal >= FREE_SHIPPING_LIMIT;
    let courierFinalPrice = courierBasePrice;
    let parcelFinalPrice = parcelBasePrice;

    if (isFreeEligible) {
        if (totalWeight <= FREE_SHIPPING_MAX_WEIGHT) {
            courierFinalPrice = 0;
            parcelFinalPrice = 0;
        } else {
            // 10 kg felett 1990 Ft kedvezmény
            courierFinalPrice = Math.max(0, courierBasePrice - 1990);
            parcelFinalPrice = Math.max(0, parcelBasePrice - 1990);
        }
    }

    if (courierPriceEl) {
        courierPriceEl.textContent = courierFinalPrice === 0 ? "Ingyenes" : `${courierFinalPrice.toLocaleString('hu-HU')} Ft`;
    }
    if (parcelPriceEl) {
        parcelPriceEl.textContent = isParcelTooHeavy ? "Nem elérhető" : (parcelFinalPrice === 0 ? "Ingyenes" : `${parcelFinalPrice.toLocaleString('hu-HU')} Ft`);
    }

    // Aktuálisan kiválasztott szállítási díj
    let activeShippingFee = 0;
    if (selectedShipping === 'courier') activeShippingFee = courierFinalPrice;
    else if (selectedShipping === 'parcel') activeShippingFee = parcelFinalPrice;
    else if (selectedShipping === 'pickup') activeShippingFee = 0;

    const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_LIMIT) * 100));
    if (freeShippingProgress) freeShippingProgress.style.width = `${progressPercent}%`;

    if (freeShippingText) {
        if (isFreeEligible) {
            if (totalWeight <= FREE_SHIPPING_MAX_WEIGHT) {
                freeShippingText.innerHTML = "🎉 Elérte az <strong>ingyenes házhozszállítást</strong>!";
            } else {
                freeShippingText.innerHTML = "🎉 18 000 Ft feletti rendelés: <strong>1 990 Ft szállítási kedvezmény</strong> érvényesítve a nagysúlyú csomagra!";
            }
        } else {
            const diff = FREE_SHIPPING_LIMIT - subtotal;
            freeShippingText.innerHTML = `Még <strong>${diff.toLocaleString('hu-HU')} Ft</strong> az ingyenes szállításhoz!`;
        }
    }

    const finalTotal = subtotal + activeShippingFee;

    if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toLocaleString('hu-HU')} Ft`;
    if (cartShippingFee) cartShippingFee.textContent = activeShippingFee === 0 ? "Ingyenes" : `${activeShippingFee.toLocaleString('hu-HU')} Ft`;
    if (cartTotal) cartTotal.textContent = `${finalTotal.toLocaleString('hu-HU')} Ft`;

    if (floatingCount) floatingCount.textContent = `${totalItemCount} db méz (${totalWeight} kg)`;
    if (floatingTotal) floatingTotal.textContent = `${finalTotal.toLocaleString('hu-HU')} Ft`;

    // Eseménykezelők a mennyiség gombokhoz
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