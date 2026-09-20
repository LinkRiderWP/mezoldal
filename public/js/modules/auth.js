import { authApi } from '../services/auth.api.js';
import { showToast } from './ui.js';

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
    if (!headerBtn) return;

    if (currentUser) {
        headerBtn.classList.add("logged-in");
        if (headerBtnText) headerBtnText.textContent = currentUser.name.split(" ")[0];
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

    if (openBtn) openBtn.addEventListener("click", () => openAuthModal());
    if (closeBtn) closeBtn.addEventListener("click", () => closeAuthModal());
    if (logoutBtn) logoutBtn.addEventListener("click", () => logout(true));

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            const res = await authApi.login(email, password);
            if (res.success) {
                authApi.setToken(res.token);
                currentUser = res.user;
                updateAuthUI();
                closeAuthModal();
                showToast(res.message, "success");
            } else {
                showToast(res.message || "Sikertelen bejelentkezés!", "error");
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