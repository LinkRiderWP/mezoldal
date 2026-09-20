export function showToast(message, type = "warning") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "⚠️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";

    toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${message}</span>
  `;

    container.appendChild(toast);
    void toast.offsetHeight;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove());
    }, 4000);
}

export function initScrollReveal() {
    const revealElements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

    revealElements.forEach((el) => observer.observe(el));
}

export function initMobileMenu() {
    const hamburger = document.getElementById("hamburger");
    const menu = document.getElementById("menu");
    if (!hamburger || !menu) return;

    const toggle = (open) => {
        const isOpen = open !== undefined ? open : !menu.classList.contains("open");
        menu.classList.toggle("open", isOpen);
        hamburger.classList.toggle("active", isOpen);
        hamburger.setAttribute("aria-expanded", isOpen);
        document.body.classList.toggle("menu-open", isOpen);
    };

    hamburger.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
    });

    document.querySelectorAll(".menu a").forEach((link) => {
        link.addEventListener("click", () => toggle(false));
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("open")) toggle(false);
    });

    document.addEventListener("click", (e) => {
        if (menu.classList.contains("open") && !menu.contains(e.target) && !hamburger.contains(e.target)) {
            toggle(false);
        }
    });
}

export function initHeaderScroll() {
    const header = document.querySelector(".main-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
        header.classList.toggle("scrolled", window.scrollY > 40);
    }, { passive: true });
}

export function initBackToTop() {
    const btn = document.getElementById("backToTop");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        btn.classList.toggle("show", window.scrollY > 350);
    }, { passive: true });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

export function initActiveNavObserver() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".menu .nav-link");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute("id");
                navLinks.forEach((link) => {
                    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
                });
            }
        });
    }, { threshold: 0.3, rootMargin: "-80px 0px 0px 0px" });

    sections.forEach((s) => observer.observe(s));
}

export function initAccordion() {
    document.querySelectorAll(".accordion-header").forEach((header) => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const isActive = item.classList.contains("active-item");

            document.querySelectorAll(".accordion-item").forEach((other) => {
                other.classList.remove("active-item");
                const btn = other.querySelector(".accordion-header");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });

            if (!isActive) {
                item.classList.add("active-item");
                header.setAttribute("aria-expanded", "true");
            }
        });
    });
}

export function initCardGlow() {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const elements = document.querySelectorAll(".card, .value-card, .accordion-item, .info-card, .contact-form-wrapper, .order-calculator-box, .social-box");

    elements.forEach((el) => {
        let ticking = false;
        el.addEventListener("mousemove", (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const rect = el.getBoundingClientRect();
                    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
                    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    });
}

export function initCurrentYear() {
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}