export function initAmbientPollen() {
    const container = document.getElementById("ambientParticles");
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 10 : 20;

    for (let i = 0; i < particleCount; i++) {
        const pollen = document.createElement("div");
        pollen.className = "pollen";

        const size = Math.random() * 6 + 3;
        const left = Math.random() * 100;
        const duration = Math.random() * 14 + 14;
        const delay = Math.random() * -25;
        const drift = Math.random() * 60 - 30;
        const opacity = Math.random() * 0.35 + 0.15;

        pollen.style.width = `${size}px`;
        pollen.style.height = `${size}px`;
        pollen.style.left = `${left}%`;
        pollen.style.setProperty("--duration", `${duration}s`);
        pollen.style.setProperty("--drift", `${drift}px`);
        pollen.style.setProperty("--opacity", opacity);
        pollen.style.animationDelay = `${delay}s`;

        container.appendChild(pollen);
    }
}

export function initInteractiveBee() {
    const bee = document.querySelector(".hero-bee-container");
    const hero = document.querySelector(".hero");
    if (!bee || !hero) return;

    bee.style.transition = "none";

    let currentX = 0, currentY = 0;
    let vx = 0, vy = 0;
    let currentAngleDeg = 0;
    let mouseX = -9999, mouseY = -9999;
    let isMouseNear = false;
    let targetTravelX = 0, targetTravelY = 0;
    let isAutoTraveling = false;
    let homeX = 0, homeY = 0;
    let heroWidth = 0, heroHeight = 0;

    function calculateLayout() {
        const heroRect = hero.getBoundingClientRect();
        heroWidth = heroRect.width;
        heroHeight = heroRect.height;
        bee.style.transform = "none";
        const beeRect = bee.getBoundingClientRect();
        homeX = (beeRect.left + beeRect.width / 2) - heroRect.left;
        homeY = (beeRect.top + beeRect.height / 2) - heroRect.top;
        bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
    }

    calculateLayout();
    window.addEventListener("resize", calculateLayout);

    const updateMouseCoords = (e) => {
        const rect = hero.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        mouseX = clientX - rect.left;
        mouseY = clientY - rect.top;
        isMouseNear = true;
    };

    hero.addEventListener("mousemove", updateMouseCoords, { passive: true });
    hero.addEventListener("mouseleave", () => { isMouseNear = false; });

    bee.addEventListener("click", (e) => {
        e.preventDefault();
        const padding = 40;
        const targetAbsX = padding + Math.random() * (heroWidth - 2 * padding);
        const targetAbsY = padding + Math.random() * (heroHeight - 2 * padding);
        targetTravelX = targetAbsX - homeX;
        targetTravelY = targetAbsY - homeY;
        isAutoTraveling = true;
    });

    function updatePhysics() {
        const beeCenterX = homeX + currentX;
        const beeCenterY = homeY + currentY;
        const dx = beeCenterX - mouseX;
        const dy = beeCenterY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const proximity = 140;
        const pushStrength = 3.5;
        const friction = 0.88;

        if (isAutoTraveling) {
            const tx = targetTravelX - currentX;
            const ty = targetTravelY - currentY;
            const tdist = Math.sqrt(tx * tx + ty * ty);

            if (tdist < 15) {
                isAutoTraveling = false;
            } else {
                let fx = tx * 0.06;
                let fy = ty * 0.06;
                const fdist = Math.sqrt(fx * fx + fy * fy);
                if (fdist > 6.0) {
                    fx = (fx / fdist) * 6.0;
                    fy = (fy / fdist) * 6.0;
                }
                vx += fx;
                vy += fy;
            }
        } else if (isMouseNear && dist < proximity) {
            const force = (proximity - dist) / proximity;
            if (dist > 0.1) {
                vx += (dx / dist) * force * pushStrength;
                vy += (dy / dist) * force * pushStrength;
            }
        }

        vx *= friction;
        vy *= friction;
        currentX += vx;
        currentY += vy;

        const speed = Math.sqrt(vx * vx + vy * vy);
        let targetAngle = currentAngleDeg;
        if (speed > 0.4) {
            targetAngle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
        }

        let angleDiff = targetAngle - currentAngleDeg;
        while (angleDiff < -180) angleDiff += 360;
        while (angleDiff > 180) angleDiff -= 360;
        currentAngleDeg += angleDiff * 0.12;

        const padding = 35;
        let absoluteX = homeX + currentX;
        let absoluteY = homeY + currentY;

        if (absoluteX < padding) { absoluteX = padding; vx = 0; }
        else if (absoluteX > heroWidth - padding) { absoluteX = heroWidth - padding; vx = 0; }

        if (absoluteY < padding) { absoluteY = padding; vy = 0; }
        else if (absoluteY > heroHeight - padding) { absoluteY = heroHeight - padding; vy = 0; }

        currentX = absoluteX - homeX;
        currentY = absoluteY - homeY;

        bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
        requestAnimationFrame(updatePhysics);
    }

    requestAnimationFrame(updatePhysics);
}