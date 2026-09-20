import { initAmbientPollen, initInteractiveBee } from './modules/animations.js';
import {
    initScrollReveal,
    initMobileMenu,
    initHeaderScroll,
    initBackToTop,
    initActiveNavObserver,
    initAccordion,
    initCurrentYear,
    showToast
} from './modules/ui.js';
import { loadHoneyProducts, initProductSearch } from './modules/products.js';
import { initCalculatorAndCart, initCustomerTypeToggle, clearCart } from './modules/cart.js';
import { initOrderAndSimplePay } from './modules/checkout.js';
import { initAuth } from './modules/auth.js';

function checkPaymentStatusParams() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    const alertSuccess = document.getElementById("paymentAlertSuccess");
    const alertFailed = document.getElementById("paymentAlertFailed");

    if (status === "success") {
        if (alertSuccess) alertSuccess.style.display = "block";
        clearCart();
        showToast("A fizetés sikeres volt! A visszaigazolást és a számlát elküldtük e-mailben.", "success");
    } else if (status === "failed") {
        if (alertFailed) alertFailed.style.display = "block";
        showToast("A fizetés megszakadt vagy sikertelen volt. Kérjük próbálja meg újra!", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initAmbientPollen();
    initInteractiveBee();
    initScrollReveal();
    initMobileMenu();
    initHeaderScroll();
    loadHoneyProducts();
    initAuth();
    initOrderAndSimplePay();
    initBackToTop();
    initActiveNavObserver();
    initAccordion();
    initCalculatorAndCart();
    initProductSearch();
    initCustomerTypeToggle();
    checkPaymentStatusParams();
    initCurrentYear();
});