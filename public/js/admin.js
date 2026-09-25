// public/js/admin.js
import { authApi } from './services/auth.api.js';
import { showToast } from './modules/ui.js';

const ADMIN_EMAIL = 'miklomeheszet@gmail.com';

let allOrders = [];
let allProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    initDirectLogin();
    initFilters();
    initAddProductForm();
    initLogout();

    await verifyAdminAccess();
});

function initTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetView = tab.getAttribute("data-tab");
            document.querySelectorAll(".admin-view").forEach(view => {
                view.classList.remove("active");
            });

            if (targetView === "orders") {
                document.getElementById("viewOrders").classList.add("active");
            } else if (targetView === "catalog") {
                document.getElementById("viewCatalog").classList.add("active");
            }
        });
    });

    const isSaleCheckbox = document.getElementById("newProdIsSale");
    const salePercentGroup = document.getElementById("salePercentGroup");
    if (isSaleCheckbox && salePercentGroup) {
        isSaleCheckbox.addEventListener("change", () => {
            salePercentGroup.style.display = isSaleCheckbox.checked ? "block" : "none";
        });
    }
}

async function verifyAdminAccess() {
    const token = authApi.getToken();
    const guard = document.getElementById("adminAuthGuard");
    const mainContent = document.getElementById("adminMainContent");

    if (!token) {
        showGuard();
        return;
    }

    try {
        const res = await fetch('/api/admin/check', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success && data.user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            guard.style.display = "none";
            mainContent.style.display = "block";
            await Promise.all([loadOrders(), loadCatalog()]);
        } else {
            showGuard();
        }
    } catch (err) {
        console.error("Admin ellenőrzési hiba:", err);
        showGuard();
    }
}

function showGuard() {
    document.getElementById("adminAuthGuard").style.display = "flex";
    document.getElementById("adminMainContent").style.display = "none";
}

function initDirectLogin() {
    const form = document.getElementById("adminDirectLoginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("guardEmail").value;
        const password = document.getElementById("guardPassword").value;

        const res = await authApi.login(email, password);
        if (res.success && res.token) {
            authApi.setToken(res.token);
            showToast("Sikeres adminisztrátori belépés!", "success");
            await verifyAdminAccess();
        } else {
            showToast(res.message || "Hibás adminisztrátori jelszó!", "error");
        }
    });
}

function initLogout() {
    const btn = document.getElementById("adminLogoutBtn");
    if (btn) {
        btn.addEventListener("click", () => {
            authApi.removeToken();
            window.location.reload();
        });
    }
}

// ==========================================
// 1. MEGRENDELÉSEK BETÖLTÉSE ÉS MEGJELENÍTÉSE
// ==========================================
async function loadOrders() {
    const container = document.getElementById("adminOrdersContainer");
    const countBadge = document.getElementById("ordersCountBadge");

    try {
        const res = await fetch('/api/admin/orders', {
            headers: { 'Authorization': `Bearer ${authApi.getToken()}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            allOrders = data.orders || [];
            if (countBadge) countBadge.textContent = allOrders.length;
            renderOrders(allOrders);
        } else {
            container.innerHTML = `<div class="admin-empty">❌ ${data.message || 'Nem sikerült betölteni a rendeléseket.'}</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="admin-empty">❌ Hálózati hiba a rendelések lekérésekor.</div>`;
    }
}

function renderOrders(orders) {
    const container = document.getElementById("adminOrdersContainer");
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="admin-empty">📭 Még nem érkezett megrendelés a rendszerbe.</div>';
        return;
    }

    container.innerHTML = orders.map(ord => {
        const isPaid = ord.status === 'PAID';
        const formattedDate = ord.createdAt ? new Date(ord.createdAt).toLocaleString('hu-HU') : 'N/A';
        const cust = ord.customer || {};

        const itemsRows = (ord.items || []).map(it => `
            <tr>
                <td><strong>${it.name || it.cim}</strong></td>
                <td>${it.size || ''}</td>
                <td>${it.qty || it.quantity} db</td>
                <td style="text-align: right; color: var(--primary-color);"><strong>${Number(it.total || (it.price * it.qty)).toLocaleString('hu-HU')} Ft</strong></td>
            </tr>
        `).join('');

        return `
        <article class="admin-order-card">
            <div class="admin-order-header">
                <div>
                    <span class="order-ref-title">#${ord.orderRef}</span>
                    <span class="order-date-text">📅 ${formattedDate}</span>
                </div>
                <div class="badges-group">
                    <span class="status-tag ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Kifizetve (SimplePay)' : 'Függőben'}</span>
                    ${ord.invoiceNumber ? `<span class="status-tag invoice">🧾 Számla: ${ord.invoiceNumber}</span>` : ''}
                </div>
            </div>

            <div class="admin-order-body">
                <!-- Vevőadatok -->
                <div class="order-info-section">
                    <h4>👤 Vevő & Kézbesítés</h4>
                    <p><strong>Név:</strong> ${cust.name || 'N/A'} ${cust.company ? `(${cust.company})` : ''}</p>
                    ${cust.taxNumber ? `<p><strong>Adószám:</strong> ${cust.taxNumber}</p>` : ''}
                    <p><strong>E-mail:</strong> <a href="mailto:${cust.email}" style="color: var(--primary-light);">${cust.email}</a></p>
                    <p><strong>Telefon:</strong> <a href="tel:${cust.phone}" style="color: var(--primary-light);">${cust.phone}</a></p>
                    <p><strong>Szállítási cím:</strong> ${cust.zip || ''} ${cust.city || ''}, ${cust.address || ''}</p>
                    <p><strong>Szállítási mód:</strong> ${ord.shipping?.name || 'Futár'} (<strong>${ord.totalWeightKg || 0} kg</strong>)</p>
                    ${ord.note ? `<p style="margin-top: 0.5rem; background: rgba(226,161,54,0.08); padding: 0.4rem; border-radius: 4px;"><strong>Megjegyzés a futárnak:</strong> "${ord.note}"</p>` : ''}
                </div>

                <!-- Tételek -->
                <div class="order-info-section">
                    <h4>🍯 Rendelt Tételek</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Tétel</th>
                                <th>Méret</th>
                                <th>Darab</th>
                                <th style="text-align: right;">Ár</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="admin-order-footer">
                <div>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">
                        Szállítás: <strong>${ord.shipping?.price === 0 ? 'Ingyenes' : `${Number(ord.shipping?.price || 0).toLocaleString('hu-HU')} Ft`}</strong>
                        ${ord.transactionId ? ` | Tranzakció azonosító: <code>${ord.transactionId}</code>` : ''}
                    </span>
                </div>
                <div class="order-total-highlight">
                    Végösszeg: ${Number(ord.totalAmount || 0).toLocaleString('hu-HU')} Ft
                </div>
            </div>
        </article>
        `;
    }).join('');
}

function initFilters() {
    const searchInput = document.getElementById("orderSearchInput");
    const statusSelect = document.getElementById("orderStatusFilter");
    const refreshBtn = document.getElementById("refreshOrdersBtn");

    const applyFilter = () => {
        const query = searchInput.value.toLowerCase().trim();
        const status = statusSelect.value;

        const filtered = allOrders.filter(ord => {
            const ref = (ord.orderRef || '').toLowerCase();
            const name = (ord.customer?.name || '').toLowerCase();
            const email = (ord.customer?.email || '').toLowerCase();
            const matchesQuery = ref.includes(query) || name.includes(query) || email.includes(query);

            const matchesStatus = (status === 'ALL') || (ord.status === status);
            return matchesQuery && matchesStatus;
        });

        renderOrders(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (statusSelect) statusSelect.addEventListener("change", applyFilter);
    if (refreshBtn) refreshBtn.addEventListener("click", () => loadOrders());
}

// ==========================================
// 2. KÍNÁLAT KEZELÉSE (HOZZÁADÁS ÉS TÖRLÉS)
// ==========================================
async function loadCatalog() {
    const container = document.getElementById("adminCatalogList");
    const countBadge = document.getElementById("productsCountBadge");
    const countSub = document.getElementById("catalogCountSub");

    try {
        const res = await fetch('/api/products');
        const data = await res.json();

        if (res.ok && data.success) {
            allProducts = data.products || [];
            if (countBadge) countBadge.textContent = allProducts.length;
            if (countSub) countSub.textContent = allProducts.length;
            renderCatalog(allProducts);
        } else {
            container.innerHTML = '<div class="admin-empty">Nem sikerült betölteni a kínálatot.</div>';
        }
    } catch {
        container.innerHTML = '<div class="admin-empty">Hálózati hiba a kínálat betöltésekor.</div>';
    }
}

function renderCatalog(products) {
    const container = document.getElementById("adminCatalogList");
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<div class="admin-empty">A kínálat jelenleg üres.</div>';
        return;
    }

    container.innerHTML = products.map(prod => `
        <div class="catalog-item-row" data-id="${prod.id}">
            <div class="catalog-item-info">
                <img src="${prod.kep || 'kepek/mez.jpg'}" alt="${prod.cim}" class="catalog-item-thumb" onerror="this.src='kepek/mez.jpg'" />
                <div>
                    <div class="catalog-item-title">${prod.cim} ${prod.isSale ? '<span style="color:var(--accent-color); font-size:0.75rem;">(AKCIÓ)</span>' : ''}</div>
                    <div class="catalog-item-prices">
                        250g: <strong>${(prod.arak?.["250g"] || 0).toLocaleString('hu-HU')} Ft</strong> | 
                        500g: <strong>${(prod.arak?.["500g"] || 0).toLocaleString('hu-HU')} Ft</strong> | 
                        900g: <strong>${(prod.arak?.["900g"] || 0).toLocaleString('hu-HU')} Ft</strong>
                    </div>
                </div>
            </div>
            <button type="button" class="btn-delete-product" data-id="${prod.id}" data-title="${prod.cim}">
                🗑️ Törlés
            </button>
        </div>
    `).join('');

    // Törlés eseménykezelők
    container.querySelectorAll(".btn-delete-product").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const title = e.currentTarget.getAttribute("data-title");

            if (!confirm(`Biztosan törölni szeretné a(z) "${title}" mézet a kínálatból?`)) {
                return;
            }

            try {
                const res = await fetch(`/api/admin/products/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authApi.getToken()}` }
                });
                const resData = await res.json();

                if (res.ok && resData.success) {
                    showToast(resData.message, "success");
                    await loadCatalog();
                } else {
                    showToast(resData.message || "Nem sikerült törölni a terméket.", "error");
                }
            } catch (err) {
                showToast("Hiba a törlési művelet közben.", "error");
            }
        });
    });
}

function initAddProductForm() {
    const form = document.getElementById("addProductForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("saveProductBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Mentés folyamatban...";

        const payload = {
            cim: document.getElementById("newProdTitle").value,
            leiras: document.getElementById("newProdDesc").value,
            kep: document.getElementById("newProdImage").value,
            price250: document.getElementById("price250").value,
            price500: document.getElementById("price500").value,
            price900: document.getElementById("price900").value,
            bulkPrice: document.getElementById("bulkPrice").value,
            isSale: document.getElementById("newProdIsSale").checked,
            discountPercentage: document.getElementById("newProdDiscount").value
        };

        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authApi.getToken()}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message, "success");
                form.reset();
                document.getElementById("salePercentGroup").style.display = "none";
                await loadCatalog();
            } else {
                showToast(data.message || "Nem sikerült hozzáadni a mézet.", "error");
            }
        } catch (err) {
            showToast("Hiba a méz mentése során.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Méz közzététele a webshopban";
        }
    });
}