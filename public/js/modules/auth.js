// public/js/modules/auth.js
import { authApi } from '../services/auth.api.js';
import { showToast } from './ui.js';

const ADMIN_EMAIL = 'miklomeheszet@gmail.com';
let currentUser = null;
let userOrders = [];

export function getToken() {
    return authApi.getToken();
}

export function getCurrentUser() {
    return currentUser;
}

export async function initAuth() {
    if (authApi.getToken()) {
        await refreshUserData();
    }
    updateAuthUI();
    initAuthModalEvents();
    initProfileSubtabs();
}

async function refreshUserData() {
    try {
        const data = await authApi.getProfile();
        if (data?.success) {
            currentUser = data.user;
            userOrders = data.orders || [];
            prefillCheckoutForm(data.user);
            populateProfileForm(data.user);
            renderUserOrders(userOrders);
            syncNotificationToggle(data.user.wantsEmailNotification !== false);
        } else {
            logout(false);
        }
    } catch {
        logout(false);
    }
}

export function logout(notify = true) {
    authApi.removeToken();
    currentUser = null;
    userOrders = [];
    updateAuthUI();
    closeAuthModal();
    if (notify) showToast("Sikeresen kijelentkezett!", "success");
}

function updateAuthUI() {
    const headerBtn = document.getElementById("headerAuthBtn");
    const headerBtnText = document.getElementById("headerAuthBtnText");
    const profileEmailText = document.getElementById("profileUserEmail");
    const profileUserName = document.getElementById("profileUserName");
    const adminDirectArea = document.getElementById("adminDirectAccessArea");

    if (!headerBtn) return;

    if (currentUser) {
        headerBtn.classList.add("logged-in");
        const isAdmin = currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (headerBtnText) {
            headerBtnText.textContent = isAdmin ? "👑 Vezérlőpult" : currentUser.name.split(" ")[0];
        }

        if (profileUserName) profileUserName.textContent = currentUser.name;
        if (profileEmailText) profileEmailText.textContent = currentUser.email;

        if (adminDirectArea) {
            adminDirectArea.style.display = isAdmin ? "block" : "none";
        }
    } else {
        headerBtn.classList.remove("logged-in");
        if (headerBtnText) headerBtnText.textContent = "Bejelentkezés";
    }
}

export function prefillCheckoutForm(user) {
    if (!user) return;
    const map = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        zip: user.zip,
        city: user.city,
        address: user.address,
        companyName: user.company,
        taxNumber: user.taxNumber
    };
    for (const [id, val] of Object.entries(map)) {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = val || "";
    }
}

function populateProfileForm(user) {
    if (!user) return;
    const nameField = document.getElementById("profEditName");
    const phoneField = document.getElementById("profEditPhone");
    const zipField = document.getElementById("profEditZip");
    const cityField = document.getElementById("profEditCity");
    const addressField = document.getElementById("profEditAddress");
    const compField = document.getElementById("profEditCompany");
    const taxField = document.getElementById("profEditTax");

    if (nameField) nameField.value = user.name || "";
    if (phoneField) phoneField.value = user.phone || "";
    if (zipField) zipField.value = user.zip || "";
    if (cityField) cityField.value = user.city || "";
    if (addressField) addressField.value = user.address || "";
    if (compField) compField.value = user.company || "";
    if (taxField) taxField.value = user.taxNumber || "";
}

function syncNotificationToggle(val) {
    const toggle = document.getElementById("userEmailPrefToggle");
    if (toggle) toggle.checked = val;
}

function renderUserOrders(orders) {
    const container = document.getElementById("userOrdersList");
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-user-orders">Még nem adott le rendelést webáruházunkban.</div>';
        return;
    }

    container.innerHTML = orders.map(ord => {
        const isPaid = ord.status === 'PAID';
        const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('hu-HU') : 'N/A';
        const itemsSummary = (ord.items || []).map(it => `${it.name || it.cim} (${it.qty || 1} db)`).join(', ');

        return `
            <div class="user-order-card">
                <div class="user-order-header">
                    <span class="user-order-ref">#${ord.orderRef}</span>
                    <span class="user-order-date">${dateStr}</span>
                </div>
                <div class="user-order-items-summary">
                    ${itemsSummary || 'Méz rendelés'}
                </div>
                <div class="user-order-footer">
                    <span class="user-order-pill ${isPaid ? 'paid' : 'pending'}">
                        ${isPaid ? '✓ Kifizetve' : 'Függőben'}
                    </span>
                    <strong class="user-order-total">${Number(ord.totalAmount || 0).toLocaleString('hu-HU')} Ft</strong>
                </div>
            </div>
        `;
    }).join('');
}

function initProfileSubtabs() {
    const subtabs = document.querySelectorAll(".profile-subtab-btn");
    subtabs.forEach(btn => {
        btn.addEventListener("click", () => {
            subtabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetPaneId = btn.getAttribute("data-subtab");
            document.querySelectorAll(".profile-subtab-pane").forEach(pane => {
                pane.classList.remove("active");
            });

            const activePane = document.getElementById(targetPaneId);
            if (activePane) activePane.classList.add("active");
        });
    });

    // 1. Profiladatok mentése esemény
    const editForm = document.getElementById("editProfileForm");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btnSaveProfile");
            btn.disabled = true;
            btn.textContent = "Mentés...";

            const payload = {
                name: document.getElementById("profEditName").value,
                phone: document.getElementById("profEditPhone").value,
                zip: document.getElementById("profEditZip").value,
                city: document.getElementById("profEditCity").value,
                address: document.getElementById("profEditAddress").value,
                company: document.getElementById("profEditCompany").value,
                taxNumber: document.getElementById("profEditTax").value
            };

            try {
                const res = await authApi.updateProfile(payload);
                if (res.success && res.user) {
                    currentUser = res.user;
                    updateAuthUI();
                    prefillCheckoutForm(res.user);
                    showToast("Profiladatai sikeresen frissültek!", "success");
                } else {
                    showToast(res.message || "Nem sikerült frissíteni az adatokat.", "error");
                }
            } catch {
                showToast("Hiba történt a profil mentése során.", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Adatok mentése";
            }
        });
    }

    // 2. Jelszócsere esemény
    const pwdForm = document.getElementById("changePasswordForm");
    if (pwdForm) {
        pwdForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btnSavePassword");
            const curInput = document.getElementById("currentPasswordInput");
            const newInput = document.getElementById("newPasswordInput");

            btn.disabled = true;
            btn.textContent = "Módosítás folyamatban...";

            try {
                const res = await authApi.changePassword(curInput.value, newInput.value);
                if (res.success) {
                    showToast("Jelszava sikeresen megváltoztatva!", "success");
                    pwdForm.reset();
                } else {
                    showToast(res.message || "Nem sikerült módosítani a jelszót.", "error");
                }
            } catch {
                showToast("Hiba a jelszó módosítása során.", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Jelszó megváltoztatása";
            }
        });
    }

    // 3. Értesítési preferencia kapcsoló
    const prefToggle = document.getElementById("userEmailPrefToggle");
    if (prefToggle) {
        prefToggle.addEventListener("change", async () => {
            const wants = prefToggle.checked;
            try {
                const res = await authApi.updatePreferences(wants);
                if (res.success) {
                    showToast(wants ? "E-mail értesítések bekapcsolva." : "E-mail értesítések kikapcsolva.", "success");
                }
            } catch {
                showToast("Nem sikerült elmenteni az értesítési beállítást.", "warning");
            }
        });
    }
}

function initAuthModalEvents() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const openBtn = document.getElementById("headerAuthBtn");
    const closeBtn = document.getElementById("closeAuthModalBtn");
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabRegisterBtn = document.getElementById("tabRegisterBtn");
    const viewLogin = document.getElementById("viewLogin");
    const viewRegister = document.getElementById("viewRegister");
    const viewProfile = document.getElementById("viewProfile");
    const authTabsNav = document.getElementById("authTabsNav");

    if (openBtn) {
        openBtn.addEventListener("click", () => {
            if (currentUser && currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                window.location.href = "/admin.html";
                return;
            }

            if (currentUser) {
                if (authTabsNav) authTabsNav.style.display = "none";
                if (viewLogin) viewLogin.style.display = "none";
                if (viewRegister) viewRegister.style.display = "none";
                if (viewProfile) viewProfile.style.display = "block";
                refreshUserData(); // Legfrissebb rendelések és adatok lekérése a modál megnyitásakor
            } else {
                if (authTabsNav) authTabsNav.style.display = "flex";
                if (viewProfile) viewProfile.style.display = "none";
                if (tabLoginBtn) tabLoginBtn.click();
            }
            openAuthModal();
        });
    }

    if (closeBtn) closeBtn.addEventListener("click", () => closeAuthModal());
    if (logoutBtn) logoutBtn.addEventListener("click", () => logout(true));

    if (tabLoginBtn && tabRegisterBtn) {
        tabLoginBtn.addEventListener("click", () => {
            tabLoginBtn.classList.add("active");
            tabRegisterBtn.classList.remove("active");
            if (viewLogin) viewLogin.style.display = "block";
            if (viewRegister) viewRegister.style.display = "none";
        });

        tabRegisterBtn.addEventListener("click", () => {
            tabRegisterBtn.classList.add("active");
            tabLoginBtn.classList.remove("active");
            if (viewRegister) viewRegister.style.display = "block";
            if (viewLogin) viewLogin.style.display = "none";
        });
    }

    // Bejelentkezés
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;

            const res = await authApi.login(email, password);
            if (res.success && res.token) {
                authApi.setToken(res.token);
                currentUser = res.user;
                await refreshUserData();
                updateAuthUI();
                closeAuthModal();

                if (currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                    showToast("Üdvözöljük, Adminisztrátor! Átirányítás a Vezérlőpultra...", "success");
                    setTimeout(() => window.location.href = "/admin.html", 800);
                } else {
                    showToast(res.message || "Sikeres bejelentkezés!", "success");
                }
            } else {
                showToast(res.message || "Hibás e-mail cím vagy jelszó!", "error");
            }
        });
    }

    // Regisztráció
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("regName").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const phone = document.getElementById("regPhone").value.trim() || "";
            const zip = document.getElementById("regZip").value.trim() || "";
            const city = document.getElementById("regCity").value.trim() || "";
            const address = document.getElementById("regAddress").value.trim() || "";

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            try {
                const res = await authApi.register({ name, email, password, phone, zip, city, address });
                if (res.success && res.token) {
                    authApi.setToken(res.token);
                    currentUser = res.user;
                    await refreshUserData();
                    updateAuthUI();
                    closeAuthModal();
                    registerForm.reset();

                    if (currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                        showToast("Admin fiók létrehozva! Átirányítás a Vezérlőpultra...", "success");
                        setTimeout(() => window.location.href = "/admin.html", 800);
                    } else {
                        showToast("🎉 Sikeres regisztráció!", "success");
                    }
                } else {
                    showToast(res.message || "Sikertelen regisztráció!", "error");
                }
            } catch {
                showToast("Hiba a kiszolgálóval való kommunikációban.", "error");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}

export function openAuthModal() {
    document.getElementById("authModalBackdrop")?.classList.add("active");
    document.body.classList.add("menu-open");
}

export function closeAuthModal() {
    document.getElementById("authModalBackdrop")?.classList.remove("active");
    document.body.classList.remove("menu-open");
}