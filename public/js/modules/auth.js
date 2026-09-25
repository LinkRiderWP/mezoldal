// public/js/modules/auth.js
import { authApi } from '../services/auth.api.js';
import { showToast } from './ui.js';

const ADMIN_EMAIL = 'miklomeheszet@gmail.com';
let currentUser = null;

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
}

async function refreshUserData() {
    try {
        const data = await authApi.getProfile();
        if (data?.success) {
            currentUser = data.user;
            prefillCheckoutForm(data.user);
            renderOrdersList(data.orders || []);
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
    updateAuthUI();
    closeAuthModal();
    if (notify) showToast("Sikeresen kijelentkezett!", "success");
}

function updateAuthUI() {
    const headerBtn = document.getElementById("headerAuthBtn");
    const headerBtnText = document.getElementById("headerAuthBtnText");
    const profileEmailText = document.getElementById("profileUserEmail");
    const profileUserName = document.getElementById("profileUserName");
    const profileContainer = document.getElementById("viewProfile");

    if (!headerBtn) return;

    if (currentUser) {
        headerBtn.classList.add("logged-in");
        const isAdmin = currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (headerBtnText) {
            headerBtnText.textContent = isAdmin ? "Admin (Mikló)" : currentUser.name.split(" ")[0];
        }

        if (profileUserName) profileUserName.textContent = currentUser.name;
        if (profileEmailText) profileEmailText.textContent = currentUser.email;

        // Ha az admin van bent, arany gomb a profil modálban
        let adminLink = document.getElementById("modalAdminLink");
        if (isAdmin) {
            if (!adminLink && profileContainer) {
                adminLink = document.createElement("a");
                adminLink.id = "modalAdminLink";
                adminLink.href = "/admin.html";
                adminLink.className = "btn-primary";
                adminLink.style.display = "block";
                adminLink.style.textAlign = "center";
                adminLink.style.marginBottom = "1.2rem";
                adminLink.style.textDecoration = "none";
                adminLink.innerHTML = "👑 Adminisztrációs Pult Megnyitása";
                profileContainer.insertBefore(adminLink, document.getElementById("profileOrdersList")?.previousElementSibling);
            }
        } else if (adminLink) {
            adminLink.remove();
        }

    } else {
        headerBtn.classList.remove("logged-in");
        if (headerBtnText) headerBtnText.textContent = "Bejelentkezés";
    }
}

export function prefillCheckoutForm(user) {
    if (!user) return;
    const map = { name: user.name, email: user.email, phone: user.phone, zip: user.zip, city: user.city, address: user.address };
    for (const [id, val] of Object.entries(map)) {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = val || "";
    }
}

function renderOrdersList(orders) {
    const list = document.getElementById("profileOrdersList");
    if (!list) return;

    if (!orders.length) {
        list.innerHTML = '<p class="empty-orders-note">Még nincs rögzített megrendelése.</p>';
        return;
    }

    list.innerHTML = orders.map(ord => `
        <div class="profile-order-card">
            <div class="order-card-header">
                <strong>#${ord.orderRef}</strong>
                <span class="order-status-badge ${ord.status === 'PAID' ? 'paid' : 'pending'}">
                    ${ord.status === 'PAID' ? 'Kifizetve' : 'Függőben'}
                </span>
            </div>
            <div class="order-card-total">Összesen: <strong>${Number(ord.totalAmount || 0).toLocaleString('hu-HU')} Ft</strong></div>
        </div>
    `).join('');
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

    // Modál megnyitása / nézetek váltása
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            if (currentUser) {
                if (authTabsNav) authTabsNav.style.display = "none";
                if (viewLogin) viewLogin.style.display = "none";
                if (viewRegister) viewRegister.style.display = "none";
                if (viewProfile) viewProfile.style.display = "block";
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

    // 1. BEJELENTKEZÉS KEZELÉSE
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById("loginEmail");
            const passwordInput = document.getElementById("loginPassword");

            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!email || !password) {
                showToast("Kérjük adja meg az e-mail címét és jelszavát!", "warning");
                return;
            }

            const res = await authApi.login(email, password);
            if (res.success && res.token) {
                authApi.setToken(res.token);
                currentUser = res.user;
                updateAuthUI();
                prefillCheckoutForm(res.user);
                closeAuthModal();
                showToast(res.message || "Sikeres bejelentkezés!", "success");
            } else {
                showToast(res.message || "Hibás e-mail cím vagy jelszó!", "error");
            }
        });
    }

    // 2. REGISZTRÁCIÓ KEZELÉSE (EZ HIÁNYZOTT!)
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("regName")?.value.trim();
            const email = document.getElementById("regEmail")?.value.trim();
            const password = document.getElementById("regPassword")?.value;
            const phone = document.getElementById("regPhone")?.value.trim() || "";
            const zip = document.getElementById("regZip")?.value.trim() || "";
            const city = document.getElementById("regCity")?.value.trim() || "";
            const address = document.getElementById("regAddress")?.value.trim() || "";
            const emailConsent = document.getElementById("regEmailConsent");
            const wantsEmailNotification = emailConsent ? emailConsent.checked : true;

            if (!name || !email || !password) {
                showToast("A név, e-mail cím és jelszó megadása kötelező!", "warning");
                return;
            }

            if (password.length < 6) {
                showToast("A jelszónak legalább 6 karakter hosszúnak kell lennie!", "warning");
                return;
            }

            const payload = {
                name,
                email,
                password,
                phone,
                zip,
                city,
                address,
                wantsEmailNotification
            };

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Regisztráció folyamatban...";
            }

            try {
                const res = await authApi.register(payload);

                if (res.success && res.token) {
                    // Automatikus bejelentkeztetés
                    authApi.setToken(res.token);
                    currentUser = res.user;
                    updateAuthUI();
                    prefillCheckoutForm(res.user);
                    closeAuthModal();
                    registerForm.reset();
                    showToast("🎉 Sikeres regisztráció! Automatikusan bejelentkeztünk.", "success");
                } else {
                    showToast(res.message || "Sikertelen regisztráció!", "error");
                }
            } catch (err) {
                showToast("Hiba a kiszolgálóval való kommunikációban.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Fiók létrehozása";
                }
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