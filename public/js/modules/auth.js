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
    const map = { name: user.name, email: user.email, phone: user.phone, zip: user.zip, city: user.city, address: user.address };
    for (const [id, val] of Object.entries(map)) {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = val || "";
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
            // Ha az admin van bejelentkezve, a fejléc gombja azonnal átviszi a dedikált Vezérlőpultra!
            if (currentUser && currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                window.location.href = "/admin.html";
                return;
            }

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
                updateAuthUI();
                prefillCheckoutForm(res.user);
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
                    updateAuthUI();
                    prefillCheckoutForm(res.user);
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