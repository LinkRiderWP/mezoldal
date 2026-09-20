// public/js/modules/animations.js

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

/**
 * 3D finom kártyadöntés a Rólunk képnél
 */
export function initAboutVisualInteractions() {
    const wrapper = document.getElementById("aboutVisualWrapper");
    if (!wrapper || window.innerWidth < 992) return;

    const frame = wrapper.querySelector(".about-card-frame");
    if (!frame) return;

    wrapper.addEventListener("mousemove", (e) => {
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const rotateX = -(y / rect.height) * 8;
        const rotateY = (x / rect.width) * 8;

        frame.style.animationPlayState = "paused";
        frame.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    wrapper.addEventListener("mouseleave", () => {
        frame.style.animationPlayState = "running";
        frame.style.transform = "";
    });
}

/**
 * Okos, geometriai méhsejt-méhecske
 * - Teljes mozgástér a képernyő legszéléig
 * - Természetes menekülés stabil oldalirányú kikerüléssel (nincs ugrálás/rezgés)
 * - Sarokban azonnali íves megkerülés az egér körül a szabad tér felé
 * - Kattintásra arany shockwave és szikrák robbanása
 * - Csillogó repülési fénycsík hátrahagyása
 */
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
    let trailTimer = 0;
    let beeRadius = 20; // Dinamikusan számolva a valós szélességből

    // Oldalirányú menekülés állapota (hysterézis az ugrálás megelőzésére)
    let isDodging = false;
    let lateralSign = 0;
    let cornerTrapFrames = 0;

    function calculateLayout() {
        const heroRect = hero.getBoundingClientRect();
        heroWidth = heroRect.width;
        heroHeight = heroRect.height;
        bee.style.transform = "none";
        const beeRect = bee.getBoundingClientRect();
        // A méhecske sugarának felvétele, hogy pontosan a szélig kimehessen
        beeRadius = Math.max(16, Math.min(beeRect.width, beeRect.height) / 2);
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
    hero.addEventListener("touchstart", updateMouseCoords, { passive: true });
    hero.addEventListener("touchmove", updateMouseCoords, { passive: true });
    hero.addEventListener("mouseleave", () => { isMouseNear = false; isDodging = false; });
    hero.addEventListener("touchend", () => { isMouseNear = false; isDodging = false; });
    hero.addEventListener("touchcancel", () => { isMouseNear = false; isDodging = false; });

    // Vizuális kattintási effektus (Shockwave gyűrű + 360°-os szikrarobbanás)
    function triggerClickVisuals(originX, originY) {
        const shockwave = document.createElement("div");
        shockwave.className = "bee-shockwave";
        shockwave.style.left = `${originX}px`;
        shockwave.style.top = `${originY}px`;
        shockwave.style.width = "76px";
        shockwave.style.height = "76px";
        hero.appendChild(shockwave);

        shockwave.addEventListener("animationend", () => shockwave.remove());

        const sparkleCount = 16;
        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = document.createElement("div");
            sparkle.className = "bee-sparkle";

            const angle = (Math.PI * 2 / sparkleCount) * i + (Math.random() * 0.4 - 0.2);
            const distance = 45 + Math.random() * 65;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            const size = Math.random() * 4 + 3.5;
            const duration = 0.55 + Math.random() * 0.35;

            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            sparkle.style.left = `${originX}px`;
            sparkle.style.top = `${originY}px`;
            sparkle.style.setProperty("--dx", `${dx}px`);
            sparkle.style.setProperty("--dy", `${dy}px`);
            sparkle.style.setProperty("--duration", `${duration}s`);

            hero.appendChild(sparkle);
            sparkle.addEventListener("animationend", () => sparkle.remove());
        }
    }

    // Csillámcsík kibocsátása
    function emitTrailDot(posX, posY) {
        const dot = document.createElement("div");
        dot.className = "bee-trail-dot";
        dot.style.left = `${posX + (Math.random() * 8 - 4)}px`;
        dot.style.top = `${posY + (Math.random() * 8 - 4)}px`;
        hero.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
    }

    // Kattintási esemény
    bee.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentBeeCenterX = homeX + currentX;
        const currentBeeCenterY = homeY + currentY;

        triggerClickVisuals(currentBeeCenterX, currentBeeCenterY);

        const safePaddingX = Math.max(100, heroWidth * 0.18);
        const safePaddingY = Math.max(80, heroHeight * 0.18);
        const targetAbsX = safePaddingX + Math.random() * (heroWidth - 2 * safePaddingX);
        const targetAbsY = safePaddingY + Math.random() * (heroHeight - 2 * safePaddingY);

        targetTravelX = targetAbsX - homeX;
        targetTravelY = targetAbsY - homeY;
        isAutoTraveling = true;
    });

    function updatePhysics() {
        const beeCenterX = homeX + currentX;
        const beeCenterY = homeY + currentY;
        const dx = beeCenterX - mouseX;
        const dy = beeCenterY - mouseY;
        const dist = Math.hypot(dx, dy) || 1;

        const proximity = 160;
        const pushStrength = 4.8;
        const friction = 0.88;

        const centerX = heroWidth * 0.5;
        const centerY = heroHeight * 0.5;

        // A méhecske pontos sugara határolja a mozgásteret (teljesen kimehet a széléig)
        const wallPadding = beeRadius;
        const distToLeft = beeCenterX - wallPadding;
        const distToRight = (heroWidth - wallPadding) - beeCenterX;
        const distToTop = beeCenterY - wallPadding;
        const distToBottom = (heroHeight - wallPadding) - beeCenterY;

        // Szűk zóna: csak akkor kezdődik az oldalirányú kikerülés, amikor tényleg a széléhez ért
        const wallZone = 40;
        const isNearLeft = distToLeft < wallZone;
        const isNearRight = distToRight < wallZone;
        const isNearTop = distToTop < wallZone;
        const isNearBottom = distToBottom < wallZone;
        const isNearAnyWall = isNearLeft || isNearRight || isNearTop || isNearBottom;

        // 1. Cél felé navigáció (kattintás vagy kitörési manőver után)
        if (isAutoTraveling) {
            const tx = targetTravelX - currentX;
            const ty = targetTravelY - currentY;
            const tdist = Math.hypot(tx, ty);

            if (tdist < 22) {
                isAutoTraveling = false;
                cornerTrapFrames = 0;
            } else {
                let fx = tx * 0.085;
                let fy = ty * 0.085;
                const fdist = Math.hypot(fx, fy);
                if (fdist > 8.5) {
                    fx = (fx / fdist) * 8.5;
                    fy = (fy / fdist) * 8.5;
                }
                vx += fx;
                vy += fy;
            }
        }
        // 2. Egér elöli menekülés
        else if (isMouseNear && dist < proximity) {
            const force = (proximity - dist) / proximity;
            const nx = dx / dist;
            const ny = dy / dist;

            const perpX = -ny;
            const perpY = nx;

            const toCenterX = centerX - beeCenterX;
            const toCenterY = centerY - beeCenterY;

            let isBlockedByWall = false;
            if (isNearLeft && nx < 0.1) isBlockedByWall = true;
            if (isNearRight && nx > -0.1) isBlockedByWall = true;
            if (isNearTop && ny < 0.1) isBlockedByWall = true;
            if (isNearBottom && ny > -0.1) isBlockedByWall = true;

            if (isNearAnyWall && isBlockedByWall) {
                if (!isDodging) {
                    isDodging = true;
                    const dotP = perpX * toCenterX + perpY * toCenterY;
                    lateralSign = dotP >= 0 ? 1 : -1;
                }

                if ((isNearLeft || isNearRight) && (isNearTop || isNearBottom) && dist < 70) {
                    cornerTrapFrames++;
                } else {
                    cornerTrapFrames = Math.max(0, cornerTrapFrames - 1);
                }

                if (cornerTrapFrames > 12) {
                    const safeTargetX = centerX + (Math.random() * 160 - 80);
                    const safeTargetY = centerY + (Math.random() * 120 - 60);
                    targetTravelX = safeTargetX - homeX;
                    targetTravelY = safeTargetY - homeY;
                    isAutoTraveling = true;
                    isDodging = false;
                    cornerTrapFrames = 0;

                    const escapeAngle = Math.atan2(targetTravelY - currentY, targetTravelX - currentX);
                    vx = Math.cos(escapeAngle) * 7.5;
                    vy = Math.sin(escapeAngle) * 7.5;
                } else {
                    let sideX = perpX * lateralSign;
                    let sideY = perpY * lateralSign;

                    if (isNearLeft && sideX < 0) sideX = 0;
                    if (isNearRight && sideX > 0) sideX = 0;
                    if (isNearTop && sideY < 0) sideY = 0;
                    if (isNearBottom && sideY > 0) sideY = 0;

                    const sideLen = Math.hypot(sideX, sideY);
                    if (sideLen > 0.1) {
                        sideX /= sideLen;
                        sideY /= sideLen;
                    }

                    const dodgeSpeed = pushStrength * 1.55 * Math.max(0.45, force);
                    vx += sideX * dodgeSpeed;
                    vy += sideY * dodgeSpeed;
                }
            } else {
                isDodging = false;
                cornerTrapFrames = 0;
                vx += nx * pushStrength * force;
                vy += ny * pushStrength * force;
            }
        } else {
            isDodging = false;
            cornerTrapFrames = 0;
        }

        // 3. Nagyon szűk, puha rugómező közvetlenül a szélénél (csak az utolsó 20px-en fékez lágyan)
        const cushion = 20;
        if (distToLeft < cushion) {
            const r = (cushion - distToLeft) / cushion;
            vx += r * r * 1.8;
        } else if (distToRight < cushion) {
            const r = (cushion - distToRight) / cushion;
            vx -= r * r * 1.8;
        }

        if (distToTop < cushion) {
            const r = (cushion - distToTop) / cushion;
            vy += r * r * 1.8;
        } else if (distToBottom < cushion) {
            const r = (cushion - distToBottom) / cushion;
            vy -= r * r * 1.8;
        }

        // 4. Mozgás és súrlódás
        vx *= friction;
        vy *= friction;
        currentX += vx;
        currentY += vy;

        const speed = Math.hypot(vx, vy);

        if (speed > 1.3 || isAutoTraveling) {
            bee.classList.add("fast-wings");
        } else {
            bee.classList.remove("fast-wings");
        }

        trailTimer++;
        if (speed > 2.2 && trailTimer % 3 === 0) {
            emitTrailDot(beeCenterX, beeCenterY);
        }

        let targetAngle = currentAngleDeg;
        if (speed > 0.35) {
            targetAngle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
        }

        let angleDiff = targetAngle - currentAngleDeg;
        while (angleDiff < -180) angleDiff += 360;
        while (angleDiff > 180) angleDiff -= 360;
        currentAngleDeg += angleDiff * 0.14;

        // 5. Kemény korlátok: pont a méhecske pereme érinti a képernyő legszélét
        let absoluteX = homeX + currentX;
        let absoluteY = homeY + currentY;

        if (absoluteX < wallPadding) {
            absoluteX = wallPadding;
            vx = Math.abs(vx) * 0.2;
        } else if (absoluteX > heroWidth - wallPadding) {
            absoluteX = heroWidth - wallPadding;
            vx = -Math.abs(vx) * 0.2;
        }

        if (absoluteY < wallPadding) {
            absoluteY = wallPadding;
            vy = Math.abs(vy) * 0.2;
        } else if (absoluteY > heroHeight - wallPadding) {
            absoluteY = heroHeight - wallPadding;
            vy = -Math.abs(vy) * 0.2;
        }

        currentX = absoluteX - homeX;
        currentY = absoluteY - homeY;

        bee.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngleDeg}deg)`;
        requestAnimationFrame(updatePhysics);
    }

    requestAnimationFrame(updatePhysics);
}