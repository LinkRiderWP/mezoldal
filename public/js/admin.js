// public/js/admin.js
import { authApi } from './services/auth.api.js';
import { showToast } from './modules/ui.js';

const ADMIN_EMAIL = 'miklomeheszet@gmail.com';

let allOrders = [];
let allProducts = [];
let availableImages = [];

document.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    initDirectLogin();
    initFilters();
    initImageUploader();
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
            await Promise.all([loadOrders(), loadCatalog(), loadAvailableImages()]);
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

// ============================================================
// KÉPFELTÖLTÉS ÉS KÉPTÁR KEZELÉSE
// ============================================================
function initImageUploader() {
    const dropzone = document.getElementById("imageDropzone");
    const fileInput = document.getElementById("prodImageFileInput");
    const changeBtn = document.getElementById("btnChangeImage");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());
    if (changeBtn) changeBtn.addEventListener("click", () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
        });
    });

    dropzone.addEventListener("drop", (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadImageFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadImageFile(e.target.files[0]);
        }
    });
}

async function uploadImageFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Csak képformátum tölthető fel (JPG, PNG, WEBP)!", "error");
        return;
    }

    const dropzone = document.getElementById("imageDropzone");
    const originalText = dropzone.innerHTML;
    dropzone.innerHTML = `<div class="dropzone-text">⏳ <strong>"${file.name}" feltöltése folyamatban...</strong></div>`;

    const formData = new FormData();
    formData.append("image", file);

    try {
        const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authApi.getToken()}`
            },
            body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast("Kép sikeresen feltöltve a szerverre!", "success");
            setSelectedImage(data.filePath);
            await loadAvailableImages();
        } else {
            showToast(data.message || "Nem sikerült feltölteni a képet.", "error");
        }
    } catch {
        showToast("Hálózati hiba a kép feltöltése során.", "error");
    } finally {
        dropzone.innerHTML = originalText;
    }
}

function setSelectedImage(imagePath) {
    const hiddenInput = document.getElementById("newProdImage");
    const previewImg = document.getElementById("selectedImagePreview");
    const nameText = document.getElementById("selectedImageNameText");

    if (hiddenInput) hiddenInput.value = imagePath;
    if (previewImg) previewImg.src = imagePath;
    if (nameText) nameText.textContent = imagePath;

    document.querySelectorAll(".gallery-chip-item").forEach(chip => {
        chip.classList.toggle("active", chip.getAttribute("data-src") === imagePath);
    });
}

async function loadAvailableImages() {
    const galleryContainer = document.getElementById("quickGalleryContainer");
    if (!galleryContainer) return;

    try {
        const res = await fetch('/api/admin/images', {
            headers: { 'Authorization': `Bearer ${authApi.getToken()}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            availableImages = data.images || [];
            renderGalleryChips(availableImages);
        }
    } catch {
        galleryContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Nem sikerült lekérni a képtárat.</span>';
    }
}

function renderGalleryChips(images) {
    const galleryContainer = document.getElementById("quickGalleryContainer");
    if (!galleryContainer) return;

    if (images.length === 0) {
        galleryContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Nincs korábban feltöltött fotó.</span>';
        return;
    }

    const currentSelected = document.getElementById("newProdImage")?.value || "kepek/mez.jpg";

    galleryContainer.innerHTML = images.map(imgSrc => `
        <div class="gallery-chip-item ${imgSrc === currentSelected ? 'active' : ''}" data-src="${imgSrc}" title="${imgSrc}">
            <img src="${imgSrc}" alt="Kép" onerror="this.src='kepek/mez.jpg'" />
        </div>
    `).join('');

    galleryContainer.querySelectorAll(".gallery-chip-item").forEach(chip => {
        chip.addEventListener("click", () => {
            const src = chip.getAttribute("data-src");
            setSelectedImage(src);
        });
    });
}

// ============================================================
// 1. MEGRENDELÉSEK & STATISZTIKA
// ============================================================
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
                <td><span class="price-pill-tag">${it.size || ''}</span></td>
                <td style="text-align: center;"><strong>${it.qty || it.quantity} db</strong></td>
                <td style="text-align: right; color: var(--primary-color);"><strong>${Number(it.total || (it.price * it.qty)).toLocaleString('hu-HU')} Ft</strong></td>
            </tr>
        `).join('');

        return `
        <article class="order-full-card">
            <div class="order-top-row">
                <div>
                    <span class="order-main-tag">#${ord.orderRef}</span>
                    <span class="order-timestamp">${formattedDate}</span>
                </div>
                <div class="order-status-pills">
                    <span class="pill ${isPaid ? 'paid' : 'pending'}">${isPaid ? '✓ Kifizetve (SimplePay)' : 'Függőben'}</span>
                    ${ord.invoiceNumber ? `<span class="pill invoice">Számla: ${ord.invoiceNumber}</span>` : ''}
                </div>
            </div>

            <div class="order-grid-details">
                <div class="order-box-panel">
                    <h4>Vevő & Szállítási Cím</h4>
                    <p><strong>Név:</strong> ${cust.name || 'N/A'} ${cust.company ? `(${cust.company})` : ''}</p>
                    ${cust.taxNumber ? `<p><strong>Adószám:</strong> ${cust.taxNumber}</p>` : ''}
                    <p><strong>E-mail:</strong> <a href="mailto:${cust.email}" style="color: var(--primary-light); text-decoration: underline;">${cust.email}</a></p>
                    <p><strong>Telefonszám:</strong> <a href="tel:${cust.phone}" style="color: var(--primary-light); text-decoration: underline;">${cust.phone}</a></p>
                    <p><strong>Kézbesítési Cím:</strong> ${cust.zip || ''} ${cust.city || ''}, ${cust.address || ''}</p>
                    <p><strong>Szállítási Mód:</strong> ${ord.shipping?.name || 'Futár'} (Csomagsúly: <strong>${ord.totalWeightKg || 0} kg</strong>)</p>
                    ${ord.note ? `<div class="order-note-bubble"><strong>Megjegyzés a futárnak:</strong> "${ord.note}"</div>` : ''}
                </div>

                <div class="order-box-panel">
                    <h4>🍯 Rendelt Tételek Listája</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Termék</th>
                                <th>Kiszerelés</th>
                                <th style="text-align: center;">Mennyiség</th>
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
                <div class="order-shipping-meta">
                    Szállítási díj: <strong>${ord.shipping?.price === 0 ? 'Ingyenes' : `${Number(ord.shipping?.price || 0).toLocaleString('hu-HU')} Ft`}</strong>
                    ${ord.transactionId ? ` &nbsp;|&nbsp; Tranzakció azonosító: <code>${ord.transactionId}</code>` : ''}
                </div>
                <div class="order-total-price-box">
                    <span class="order-total-label">Fizetett Végösszeg:</span>
                    <span class="order-total-price">${Number(ord.totalAmount || 0).toLocaleString('hu-HU')} Ft</span>
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

// ============================================================
// 2. KÍNÁLAT KEZELÉSE & SZERKESZTÉSE
// ============================================================
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
                    <div class="catalog-entry-title">
                        <span>${prod.cim}</span>
                        ${prod.isSale ? '<span class="pill" style="background: rgba(240, 122, 93, 0.2); color: var(--accent-color); font-size: 0.72rem; padding: 0.2rem 0.6rem;">AKCIÓ -' + prod.discountPercentage + '%</span>' : ''}
                    </div>
                    <div class="catalog-entry-prices">
                        <span class="price-pill-tag">250g: <strong>${(prod.arak?.["250g"] || 0).toLocaleString('hu-HU')} Ft</strong></span>
                        <span class="price-pill-tag">500g: <strong>${(prod.arak?.["500g"] || 0).toLocaleString('hu-HU')} Ft</strong></span>
                        <span class="price-pill-tag">900g: <strong>${(prod.arak?.["900g"] || 0).toLocaleString('hu-HU')} Ft</strong></span>
                    </div>
                </div>
            </div>
            <div class="catalog-entry-actions">
                <button type="button" class="btn-edit-entry" data-id="${prod.id}">
                    Szerkesztés
                </button>
                <button type="button" class="btn-delete-entry" data-id="${prod.id}" data-title="${prod.cim}">
                    Törlés
                </button>
            </div>
        </div>
    `).join('');

    // Szerkesztés gombok eseményei
    container.querySelectorAll(".btn-edit-entry").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            startEditProduct(id);
        });
    });

    // Törlés gombok eseményei
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
                    // Ha a jelenleg törölt terméket szerkesztettük, megszakítjuk
                    if (document.getElementById("editProductId").value === id) {
                        cancelEditProduct();
                    }
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

function startEditProduct(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    // Mezők kitöltése a meglévő termék adataival
    document.getElementById("editProductId").value = prod.id;
    document.getElementById("newProdTitle").value = prod.cim || "";
    document.getElementById("newProdDesc").value = prod.leiras || "";
    document.getElementById("price250").value = prod.arak?.["250g"] || "";
    document.getElementById("price500").value = prod.arak?.["500g"] || "";
    document.getElementById("price900").value = prod.arak?.["900g"] || "";
    document.getElementById("bulkPrice").value = prod.nagy_tetel_ar || "";

    const isSaleCheckbox = document.getElementById("newProdIsSale");
    const salePercentGroup = document.getElementById("salePercentGroup");
    isSaleCheckbox.checked = Boolean(prod.isSale);
    document.getElementById("newProdDiscount").value = prod.discountPercentage || 15;
    salePercentGroup.style.display = isSaleCheckbox.checked ? "block" : "none";

    setSelectedImage(prod.kep || "kepek/mez.jpg");

    // Űrlap fejléc és gombok átváltása szerkesztési módra
    const titleEl = document.getElementById("formCardTitle");
    const descEl = document.getElementById("formCardDesc");
    const submitBtn = document.getElementById("saveProductBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");

    titleEl.textContent = `✏️ "${prod.cim}" szerkesztése`;
    titleEl.classList.add("is-editing");
    descEl.textContent = "Módosítsa az árakat, leírást vagy fotót, majd kattintson a módosítások mentésére.";
    submitBtn.textContent = "Módosítások mentése";
    cancelBtn.style.display = "inline-flex";

    // Finom görgetés az űrlaphoz
    const formCard = document.getElementById("addProductForm");
    if (formCard) {
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    showToast(`"${prod.cim}" betöltve a szerkesztőbe.`, "info");
}

function cancelEditProduct() {
    const form = document.getElementById("addProductForm");
    if (!form) return;

    form.reset();
    document.getElementById("editProductId").value = "";
    setSelectedImage("kepek/mez.jpg");
    document.getElementById("salePercentGroup").style.display = "none";

    const titleEl = document.getElementById("formCardTitle");
    const descEl = document.getElementById("formCardDesc");
    const submitBtn = document.getElementById("saveProductBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");

    titleEl.textContent = "Új méz hozzáadása";
    titleEl.classList.remove("is-editing");
    descEl.textContent = "A hozzáadott termék azonnal elérhetővé válik a vásárlók számára.";
    submitBtn.textContent = "Méz felvétele a kínálatba";
    cancelBtn.style.display = "none";
}

function initAddProductForm() {
    const form = document.getElementById("addProductForm");
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (!form) return;

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            cancelEditProduct();
            showToast("Szerkesztés megszakítva.", "warning");
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("saveProductBtn");
        const editId = document.getElementById("editProductId").value;
        const isEditing = Boolean(editId);

        submitBtn.disabled = true;
        submitBtn.textContent = isEditing ? "Módosítások mentése..." : "Mentés folyamatban...";

        const payload = {
            cim: document.getElementById("newProdTitle").value,
            leiras: document.getElementById("newProdDesc").value,
            kep: document.getElementById("newProdImage").value || "kepek/mez.jpg",
            price250: document.getElementById("price250").value,
            price500: document.getElementById("price500").value,
            price900: document.getElementById("price900").value,
            bulkPrice: document.getElementById("bulkPrice").value,
            isSale: document.getElementById("newProdIsSale").checked,
            discountPercentage: document.getElementById("newProdDiscount").value
        };

        try {
            const url = isEditing ? `/api/admin/products/${editId}` : '/api/admin/products';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authApi.getToken()}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message, "success");
                cancelEditProduct();
                await loadCatalog();
            } else {
                showToast(data.message || "Nem sikerült elmenteni a módosításokat.", "error");
            }
        } catch {
            showToast("Hiba történt a méz mentése során.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? "Módosítások mentése" : "Méz felvétele a kínálatba";
        }
    });
}