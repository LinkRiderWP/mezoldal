import { products } from '../data/products.data.js';
import { showToast } from './ui.js';

let cart = [];

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
        const itemKey = `${prod.cim}_${jarSize}`;
        const itemLabel = `${prod.cim} (${jarSize}-os üveg)`;

        const existingIndex = cart.findIndex((i) => i.key === itemKey);
        if (existingIndex > -1) {
            cart[existingIndex].qty += qty;
        } else {
            cart.push({
                id: prod.id, // pl. "akacmez"
                size: jarSize, // pl. "900g"
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

    renderCart();
}

export function renderCart() {
    const cartContainer = document.getElementById("cartContainer");
    const cartList = document.getElementById("cartList");
    const cartTotal = document.getElementById("cartTotal");

    if (!cartContainer || !cartList || !cartTotal) return;

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