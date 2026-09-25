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
    const tabs = document.querySelectorAll(".dash-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetId = tab.getAttribute("data-target");
            document.querySelectorAll(".dash-view-section").forEach(sec => {
                sec.classList.remove("active");
            });

            const activeSection = document.getElementById(targetId);
            if (activeSection) activeSection.classList.add("active");
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
    } catch {
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
            window.location.href = "/";
        });
    }
}

// 1. MEGRENDELÉSEK & STATISZTIKA
async function loadOrders() {
    const container = document.getElementById("adminOrdersContainer");

    try {
        const res = await fetch('/api/admin/orders', {
            headers: { 'Authorization': `Bearer ${authApi.getToken()}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            allOrders = data.orders || [];
            updateKPICards();
            renderOrders(allOrders);
        } else {
            container.innerHTML = `<div class="admin-state-note">❌ ${data.message || 'Nem sikerült betölteni a rendeléseket.'}</div>`;
        }
    } catch {
        container.innerHTML = `<div class="admin-state-note">❌ Hálózati hiba a rendelések lekérésekor.</div>`;
    }
}

function updateKPICards() {
    const revEl = document.getElementById("kpiRevenue");
    const totalEl = document.getElementById("kpiTotalOrders");
    const pendingEl = document.getElementById("kpiPendingOrders");

    let totalRevenue = 0;
    let pendingCount = 0;

    allOrders.forEach(ord => {
        if (ord.status === 'PAID') {
            totalRevenue += Number(ord.totalAmount || 0);
        } else {
            pendingCount++;
        }
    });

    if (revEl) revEl.textContent = `${totalRevenue.toLocaleString('hu-HU')} Ft`;
    if (totalEl) totalEl.textContent = `${allOrders.length} db`;
    if (pendingEl) pendingEl.textContent = `${pendingCount} db`;
}

function renderOrders(orders) {
    const container = document.getElementById("adminOrdersContainer");
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="admin-state-note">📭 Nincs megjeleníthető megrendelés a kiválasztott szűrők alapján.</div>';
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
        <article class="order-full-card">
            <div class="order-top-row">
                <div>
                    <span class="order-main-tag">#${ord.orderRef}</span>
                    <span class="order-timestamp">📅 ${formattedDate}</span>
                </div>
                <div class="order-status-pills">
                    <span class="pill ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Kifizetve (SimplePay)' : 'Függőben'}</span>
                    ${ord.invoiceNumber ? `<span class="pill invoice">🧾 Számla: ${ord.invoiceNumber}</span>` : ''}
                </div>
            </div>

            <div class="order-grid-details">
                <div class="order-box-panel">
                    <h4>👤 Vevő & Szállítás</h4>
                    <p><strong>Név:</strong> ${cust.name || 'N/A'} ${cust.company ? `(${cust.company})` : ''}</p>
                    ${cust.taxNumber ? `<p><strong>Adószám:</strong> ${cust.taxNumber}</p>` : ''}
                    <p><strong>E-mail:</strong> <a href="mailto:${cust.email}" style="color: var(--primary-light);">${cust.email}</a></p>
                    <p><strong>Telefonszám:</strong> <a href="tel:${cust.phone}" style="color: var(--primary-light);">${cust.phone}</a></p>
                    <p><strong>Cím:</strong> ${cust.zip || ''} ${cust.city || ''}, ${cust.address || ''}</p>
                    <p><strong>Szállítás:</strong> ${ord.shipping?.name || 'Futár'} (<strong>${ord.totalWeightKg || 0} kg</strong>)</p>
                    ${ord.note ? `<p style="margin-top: 0.6rem; background: rgba(226,161,54,0.08); padding: 0.5rem 0.7rem; border-radius: 6px;"><strong>Megjegyzés a futárnak:</strong> "${ord.note}"</p>` : ''}
                </div>

                <div class="order-box-panel">
                    <h4>🍯 Rendelt Tételek</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Tétel</th>
                                <th>Kiszerelés</th>
                                <th>Db</th>
                                <th style="text-align: right;">Részösszeg</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="order-bottom-summary">
                <div style="font-size: 0.88rem; color: var(--text-muted);">
                    Szállítási díj: <strong>${ord.shipping?.price === 0 ? 'Ingyenes' : `${Number(ord.shipping?.price || 0).toLocaleString('hu-HU')} Ft`}</strong>
                    ${ord.transactionId ? ` | Tranzakció ID: <code>${ord.transactionId}</code>` : ''}
                </div>
                <div class="order-total-price">
                    Fizetett Végösszeg: ${Number(ord.totalAmount || 0).toLocaleString('hu-HU')} Ft
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
            const phone = (ord.customer?.phone || '').toLowerCase();
            const city = (ord.customer?.city || '').toLowerCase();

            const matchesQuery = ref.includes(query) || name.includes(query) || email.includes(query) || phone.includes(query) || city.includes(query);
            const matchesStatus = (status === 'ALL') || (ord.status === status);

            return matchesQuery && matchesStatus;
        });

        renderOrders(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (statusSelect) statusSelect.addEventListener("change", applyFilter);
    if (refreshBtn) refreshBtn.addEventListener("click", () => loadOrders());
}

// 2. KÍNÁLAT KEZELÉSE
async function loadCatalog() {
    const container = document.getElementById("adminCatalogList");
    const countKpi = document.getElementById("kpiActiveProducts");
    const countSub = document.getElementById("catalogCountSub");

    try {
        const res = await fetch('/api/products');
        const data = await res.json();

        if (res.ok && data.success) {
            allProducts = data.products || [];
            if (countKpi) countKpi.textContent = `${allProducts.length} db`;
            if (countSub) countSub.textContent = allProducts.length;
            renderCatalog(allProducts);
        } else {
            container.innerHTML = '<div class="admin-state-note">Nem sikerült betölteni a kínálatot.</div>';
        }
    } catch {
        container.innerHTML = '<div class="admin-state-note">Hálózati hiba a kínálat betöltésekor.</div>';
    }
}

function renderCatalog(products) {
    const container = document.getElementById("adminCatalogList");
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<div class="admin-state-note">A bolt kínálata jelenleg üres.</div>';
        return;
    }

    container.innerHTML = products.map(prod => `
        <div class="catalog-entry-row" data-id="${prod.id}">
            <div class="catalog-entry-left">
                <img src="${prod.kep || 'kepek/mez.jpg'}" alt="${prod.cim}" class="catalog-entry-thumb" onerror="this.src='kepek/mez.jpg'" />
                <div>
                    <div class="catalog-entry-title">${prod.cim} ${prod.isSale ? '<span style="color:var(--accent-color); font-size:0.75rem;">(AKCIÓ -' + prod.discountPercentage + '%)</span>' : ''}</div>
                    <div class="catalog-entry-prices">
                        250g: <strong>${(prod.arak?.["250g"] || 0).toLocaleString('hu-HU')} Ft</strong> | 
                        500g: <strong>${(prod.arak?.["500g"] || 0).toLocaleString('hu-HU')} Ft</strong> | 
                        900g: <strong>${(prod.arak?.["900g"] || 0).toLocaleString('hu-HU')} Ft</strong>
                    </div>
                </div>
            </div>
            <button type="button" class="btn-delete-entry" data-id="${prod.id}" data-title="${prod.cim}">
                🗑️ Termék törlése
            </button>
        </div>
    `).join('');

    container.querySelectorAll(".btn-delete-entry").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const title = e.currentTarget.getAttribute("data-title");

            if (!confirm(`Biztosan törölni szeretné a(z) "${title}" mézet a webshopból?`)) {
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
            } catch {
                showToast("Hiba a törlési művelet során.", "error");
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
        } catch {
            showToast("Hiba a méz mentése során.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Méz felvétele a kínálatba";
        }
    });
}