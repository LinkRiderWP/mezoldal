import { showToast } from './ui.js';

const TOKEN_KEY = 'miklomez_auth_token';
let currentUser = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
    return currentUser;
}

export function isLoggedIn() {
    return !!currentUser && !!getToken();
}

export async function initAuth() {
    const token = getToken();
    if (token) {
        await fetchUserProfile();
    }
    updateAuthUI();
    initAuthModalEvents();
}

async function fetchUserProfile() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            prefillCheckoutForm(data.user);
            renderOrdersList(data.orders || []);
        } else {
            logout(false);
        }
    } catch (e) {
        console.error("Nem sikerült lekérni a profilt:", e);
    }
}

export function logout(notify = true) {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    updateAuthUI();
    closeAuthModal();
    if (notify) {
        showToast("Sikeresen kijelentkezett!", "success");
    }
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

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const zipInput = document.getElementById("zip");
    const cityInput = document.getElementById("city");
    const addressInput = document.getElementById("address");
    const companyInput = document.getElementById("companyName");
    const taxInput = document.getElementById("taxNumber");
    const typeCompRadio = document.getElementById("typeCompany");
    const emailConsent = document.getElementById("orderEmailConsent");

    if (nameInput && !nameInput.value) nameInput.value = user.name || "";
    if (emailInput && !emailInput.value) emailInput.value = user.email || "";
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || "";
    if (zipInput && !zipInput.value) zipInput.value = user.zip || "";
    if (cityInput && !cityInput.value) cityInput.value = user.city || "";
    if (addressInput && !addressInput.value) addressInput.value = user.address || "";

    if (user.company) {
        if (typeCompRadio) {
            typeCompRadio.checked = true;
            typeCompRadio.dispatchEvent(new Event("change"));
        }
        if (companyInput) companyInput.value = user.company;
        if (taxInput) taxInput.value = user.taxNumber || "";
    }

    if (emailConsent) {
        emailConsent.checked = user.wantsEmailNotification !== false;
    }
}

function renderOrdersList(orders) {
    const ordersList = document.getElementById("profileOrdersList");
    if (!ordersList) return;

    if (!orders.length) {
        ordersList.innerHTML = '<p class="empty-orders-note">Még nincs rögzített megrendelése.</p>';
        return;
    }

    ordersList.innerHTML = orders.map(ord => {
        const safeOrderRef = escapeHtml(ord.orderRef);
        const safeStatus = ord.status === 'PAID' ? 'Kifizetve' : 'Függőben';
        const statusClass = ord.status === 'PAID' ? 'paid' : 'pending';
        const formattedDate = new Date(ord.createdAt).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const itemsHtml = (ord.items || []).map(it => {
            const name = escapeHtml(it.name || it.cim || 'Méz');
            const qty = Number(it.qty || it.quantity || 1);
            return `<div>• ${name} (${qty} db)</div>`;
        }).join('');

        const totalFormatted = Number(ord.totalAmount || 0).toLocaleString('hu-HU');

        return `
        <div class="profile-order-card">
            <div class="order-card-header">
                <strong>#${safeOrderRef}</strong>
                <span class="order-status-badge ${statusClass}">${safeStatus}</span>
            </div>
            <p class="order-card-date">${formattedDate}</p>
            <div class="order-card-items">
                ${itemsHtml}
            </div>
            <div class="order-card-total">Összesen: <strong>${totalFormatted} Ft</strong></div>
        </div>
        `;
    }).join('');
}

function initAuthModalEvents() {
    const modalBackdrop = document.getElementById("authModalBackdrop");
    const openBtn = document.getElementById("headerAuthBtn");
    const closeBtn = document.getElementById("closeAuthModalBtn");

    const tabLogin = document.getElementById("tabLoginBtn");
    const tabRegister = document.getElementById("tabRegisterBtn");
    const viewLogin = document.getElementById("viewLogin");
    const viewRegister = document.getElementById("viewRegister");
    const viewProfile = document.getElementById("viewProfile");

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const logoutBtn = document.getElementById("logoutBtn");

    if (openBtn) {
        openBtn.addEventListener("click", () => {
            if (currentUser) {
                switchTab('profile');
            } else {
                switchTab('login');
            }
            openAuthModal();
        });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeAuthModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener("click", (e) => {
            if (e.target === modalBackdrop) closeAuthModal();
        });
    }

    function switchTab(target) {
        if (!viewLogin || !viewRegister || !viewProfile) return;

        viewLogin.style.display = target === 'login' ? 'block' : 'none';
        viewRegister.style.display = target === 'register' ? 'block' : 'none';
        viewProfile.style.display = target === 'profile' ? 'block' : 'none';

        if (tabLogin) tabLogin.classList.toggle("active", target === 'login');
        if (tabRegister) tabRegister.classList.toggle("active", target === 'register');

        const tabsNav = document.getElementById("authTabsNav");
        if (tabsNav) tabsNav.style.display = target === 'profile' ? 'none' : 'flex';

        if (target === 'profile' && currentUser) {
            document.getElementById("profileUserName").textContent = currentUser.name;
            document.getElementById("profileUserEmail").textContent = currentUser.email;
            document.getElementById("profileEmailConsent").checked = currentUser.wantsEmailNotification !== false;
        }
    }

    if (tabLogin) tabLogin.addEventListener("click", () => switchTab('login'));
    if (tabRegister) tabRegister.addEventListener("click", () => switchTab('register'));

    // Bejelentkezés elküldése
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    localStorage.setItem(TOKEN_KEY, data.token);
                    currentUser = data.user;
                    updateAuthUI();
                    prefillCheckoutForm(currentUser);
                    showToast(data.message, "success");
                    await fetchUserProfile();
                    closeAuthModal();
                } else {
                    showToast(data.message || "Sikertelen bejelentkezés!", "error");
                }
            } catch (err) {
                showToast("Kommunikációs hiba a szerverrel!", "error");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Regisztráció elküldése
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const payload = {
                name: document.getElementById("regName").value,
                email: document.getElementById("regEmail").value,
                password: document.getElementById("regPassword").value,
                phone: document.getElementById("regPhone").value,
                zip: document.getElementById("regZip").value,
                city: document.getElementById("regCity").value,
                address: document.getElementById("regAddress").value,
                wantsEmailNotification: document.getElementById("regEmailConsent").checked
            };

            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    localStorage.setItem(TOKEN_KEY, data.token);
                    currentUser = data.user;
                    updateAuthUI();
                    prefillCheckoutForm(currentUser);
                    showToast(data.message, "success");
                    await fetchUserProfile();
                    closeAuthModal();
                } else {
                    showToast(data.message || "Sikertelen regisztráció!", "error");
                }
            } catch (err) {
                showToast("Hiba történt a regisztráció során!", "error");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Értesítési preferencia frissítése a profilból
    const profileEmailConsent = document.getElementById("profileEmailConsent");
    if (profileEmailConsent) {
        profileEmailConsent.addEventListener("change", async () => {
            const wants = profileEmailConsent.checked;
            try {
                const res = await fetch("/api/auth/preferences", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ wantsEmailNotification: wants })
                });
                if (res.ok) {
                    if (currentUser) currentUser.wantsEmailNotification = wants;
                    showToast("Értesítési beállítás elmentve!", "success");
                }
            } catch (e) {
                showToast("Nem sikerült elmenteni a beállítást.", "error");
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => logout(true));
    }
}

export function openAuthModal() {
    const backdrop = document.getElementById("authModalBackdrop");
    if (backdrop) {
        backdrop.classList.add("active");
        document.body.classList.add("menu-open");
    }
}

export function closeAuthModal() {
    const backdrop = document.getElementById("authModalBackdrop");
    if (backdrop) {
        backdrop.classList.remove("active");
        document.body.classList.remove("menu-open");
    }
}