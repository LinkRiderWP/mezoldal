document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initMobileMenu();
  loadHoneyProducts();
  initContactForm();
  initBackToTop();
  initActiveNavObserver();
  initAccordion(); 
  initCardGlow();  
});

/**
 * Scroll Reveal Animáció (Intersection Observer API)
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  const observerOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
}

/**
 * Mobil navigációs menü kezelése és háttérgörgetés tiltása
 */
function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  if (hamburger && menu) {
    hamburger.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      hamburger.classList.toggle("active");
      document.body.classList.toggle("menu-open", isOpen);
    });

    document.querySelectorAll(".menu a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        hamburger.classList.remove("active");
        document.body.classList.remove("menu-open");
      });
    });
  }
}

/**
 * Termékek lekérése a GitHub-ról + Hibakezelés újratöltés gombbal
 */
async function loadHoneyProducts() {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) return;

  const gistUrl = "https://gist.githubusercontent.com/LinkRiderWP/72c14d567b414c98c494fb32d6ea2c41/raw/mezajanlat.json";

  try {
    const response = await fetch(gistUrl);
    if (!response.ok) throw new Error(`Hálózati hiba történt: ${response.status}`);

    const rawData = await response.text();
    const products = JSON.parse(rawData);

    productsGrid.innerHTML = "";

    products.forEach((product, index) => {
      if (!product.kep || !product.cim || !product.leiras || !product.ar) {
        console.warn(`⚠️ Hiányos adat a(z) ${index + 1}. terméknél:`, product);
        return;
      }

      // Árak és Kedvezmény meghatározása
      const originalPriceText = product.ar;
      const discountPercentage = parseInt(product.kedvezmeny) || 0;
      const isSale = discountPercentage > 0;
      
      let displayPriceHtml = "";
      let calculatedPriceText = originalPriceText;

      if (isSale) {
        const numericPrice = parseInt(originalPriceText.replace(/[^0-9]/g, ""));
        const calculatedPrice = Math.round(numericPrice * (1 - discountPercentage / 100));
        calculatedPriceText = `${calculatedPrice} Ft / üveg`;
        
        displayPriceHtml = `
          <div class="price-container">
            <span class="original-price">${originalPriceText}</span>
            <span class="price">${calculatedPriceText}</span>
          </div>
        `;
      } else {
        displayPriceHtml = `
          <div class="price-container">
            <span class="price">${originalPriceText}</span>
          </div>
        `;
      }

      // Nagy tételes ajánlat generálása
      let bulkPriceHtml = "";
      if (product.nagy_tetel_ar && product.nagy_tetel_minimum) {
        bulkPriceHtml = `
          <div class="bulk-price-box">
            <span class="bulk-icon">📦</span>
            <span class="bulk-text">Nagy tételben: <strong>${product.nagy_tetel_ar}</strong> (${product.nagy_tetel_minimum})</span>
          </div>
        `;
      }

      // Kártya összeállítása
      const card = document.createElement("article");
      card.className = `card ${isSale ? 'is-sale' : ''}`;
      card.style.transitionDelay = `${index * 0.05}s`;

      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${product.kep}" alt="${product.cim}" loading="lazy" />
          ${isSale ? `<span class="floating-badge-sale">-${discountPercentage}% AKCIÓ</span>` : ""}
        </div>
        <div class="card-content">
          <h3>${product.cim}</h3>
          <p>${product.leiras}</p>
          <div class="price-row">
            ${displayPriceHtml}
          </div>
          ${bulkPriceHtml}
        </div>
      `;

      productsGrid.appendChild(card);
    });

    // Frissítjük az új egérkövető fényeffektus kártyalistáját az újonnan betöltött elemekkel is
    initCardGlow();

  } catch (error) {
    console.error("❌ Nem sikerült a termékek betöltése:", error);
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <p style="margin-bottom: 1rem;">Sajnos jelenleg nem értük el a termékkatalógust.</p>
        <button onclick="location.reload()" class="btn-primary" style="padding: 0.6rem 1.5rem; font-size: 0.85rem;">Próbálja újra</button>
      </div>
    `;
  }
}

/**
 * Kapcsolatfelvételi űrlap valósághűbb visszajelzéssel
 */
function initContactForm() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  const submitBtn = document.getElementById("submitBtn");

  if (form && feedback && submitBtn) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = "Küldés folyamatban...";
      submitBtn.disabled = true;

      setTimeout(() => {
        feedback.textContent = "Köszönjük a megkeresést! Hamarosan válaszolunk üzenetére.";
        feedback.className = "form-feedback success";
        
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        form.reset();

        setTimeout(() => {
          feedback.style.opacity = "0";
          setTimeout(() => {
            feedback.textContent = "";
            feedback.className = "form-feedback";
            feedback.style.opacity = "";
          }, 400);
        }, 5000);
      }, 1000);
    });
  }
}

/**
 * Vissza a tetejére gomb logikája
 */
function initBackToTop() {
  const backToTopBtn = document.getElementById("backToTop");
  if (!backToTopBtn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/**
 * Aktív menüpont megjelölése a fejlécben görgetés közben (Intersection Observer)
 */
function initActiveNavObserver() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".menu .nav-link");

  const observerOptions = {
    root: null,
    threshold: 0.5,
    rootMargin: "-80px 0px 0px 0px"
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute("id");
        
        navLinks.forEach((link) => {
          if (link.getAttribute("href") === `#${activeId}`) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    navObserver.observe(section);
  });
}

/**
 * Mézkalauz Harmonika (Accordion) Kezelése
 */
function initAccordion() {
  const headers = document.querySelectorAll(".accordion-header");
  
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isCurrentlyActive = item.classList.contains("active-item");

      document.querySelectorAll(".accordion-item").forEach((otherItem) => {
        otherItem.classList.remove("active-item");
        otherItem.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
      });

      if (!isCurrentlyActive) {
        item.classList.add("active-item");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/**
 * Kártyák interaktív fény-derengése (Spotlight Effect)
 * Lekéri a kurzor relatív pozícióját a kártyákon belül, és átadja a CSS-nek.
 * Kiterjesztve az új kapcsolati kártyákra és az űrlap dobozára is.
 */
function initCardGlow() {
  const glowElements = document.querySelectorAll(".card, .value-card, .accordion-item, .info-card, .contact-form-wrapper");
  
  glowElements.forEach((element) => {
    element.addEventListener("mousemove", (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      element.style.setProperty("--mouse-x", `${x}px`);
      element.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}