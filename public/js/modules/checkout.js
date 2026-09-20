import { getCart, getSelectedShippingMethod } from './cart.js';
import { showToast } from './ui.js';
import { getToken } from './auth.js';

export function initOrderAndSimplePay() {
    const form = document.getElementById("contactForm");
    const feedback = document.getElementById("formFeedback");
    const submitBtn = document.getElementById("submitBtn");

    if (!form || !feedback || !submitBtn) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cart = getCart();

        if (cart.length === 0) {
            showToast("A kosár üres! Válasszon legalább egy mézet a megrendeléshez.", "warning");
            return;
        }

        const consent = document.getElementById("simplepayConsent");
        if (consent && !consent.checked) {
            showToast("Kérjük, fogadja el az adatkezelési és SimplePay feltételeket!", "warning");
            return;
        }

        const isCompany = document.getElementById("typeCompany").checked;
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const zip = document.getElementById("zip").value.trim();
        const city = document.getElementById("city").value.trim();
        const address = document.getElementById("address").value.trim();
        const message = document.getElementById("message").value.trim();
        const companyName = isCompany ? document.getElementById("companyName").value.trim() : "";
        const taxNumber = isCompany ? document.getElementById("taxNumber").value.trim() : "";
        const shippingMethod = getSelectedShippingMethod();

        const emailConsentCheckbox = document.getElementById("orderEmailConsent");
        const wantsEmailNotification = emailConsentCheckbox ? emailConsentCheckbox.checked : true;

        // Név ellenőrzés
        if (name.split(/\s+/).length < 2) {
            showToast("Kérjük, adja meg teljes nevét (Vezetéknév és Keresztnév)!", "warning");
            document.getElementById("name").focus();
            return;
        }

        // Magyar telefonszám validáció
        const cleanPhone = phone.replace(/[\s\-()]/g, "");
        const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;
        if (!huPhoneRegex.test(cleanPhone)) {
            showToast("Kérjük, érvényes magyar telefonszámot adjon meg!", "warning");
            document.getElementById("phone").focus();
            return;
        }

        // Irányítószám validáció
        if (!/^\d{4}$/.test(zip)) {
            showToast("Kérjük, érvényes 4 számjegyű magyar irányítószámot adjon meg!", "warning");
            document.getElementById("zip").focus();
            return;
        }

        submitBtn.disabled = true;
        const spanText = submitBtn.querySelector("span");
        if (spanText) spanText.textContent = "Átirányítás a SimplePay felületére...";

        try {
            const token = getToken();
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch("/api/create-payment", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    items: cart,
                    shippingMethod: shippingMethod,
                    customer: {
                        name,
                        email,
                        phone,
                        zip,
                        city,
                        address,
                        company: companyName,
                        taxNumber: taxNumber
                    },
                    wantsEmailNotification,
                    note: message
                })
            });

            const data = await response.json();

            if (response.ok && data.success && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                throw new Error(data.message || "A fizetési kapu nem válaszolt.");
            }

        } catch (err) {
            console.error("SimplePay indítási hiba:", err);
            feedback.textContent = `Hiba a fizetés indításakor: ${err.message}. Kérjük próbálja újra!`;
            feedback.className = "form-feedback error";
            submitBtn.disabled = false;
            if (spanText) spanText.textContent = "Tovább a biztonságos SimplePay fizetéshez";
        }
    });
}