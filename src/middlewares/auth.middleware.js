// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'miklomeheszet@gmail.com').toLowerCase().trim();

/**
 * Munkamenet token hitelesítése és felhasználó valós idejű ellenőrzése
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Hiányzó vagy érvénytelen token." });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Adatbázis ellenőrzés: a fiók létezik-e, és nem változott-e a jelszó a kiadás óta
        const userDoc = await db.collection('users').doc(decoded.id).get();
        if (!userDoc.exists) {
            return res.status(401).json({ success: false, message: "A felhasználói fiók már nem létezik." });
        }

        const userData = userDoc.data();

        // TokenVersion ellenőrzése: jelszócsere esetén a korábbi tokenek érvénytelenek
        const currentVersion = userData.tokenVersion || 1;
        const tokenVersion = decoded.tokenVersion || 1;
        if (currentVersion !== tokenVersion) {
            return res.status(401).json({
                success: false,
                message: "A munkamenet lejárt (jelszóváltoztatás miatt). Kérjük, jelentkezzen be újra!"
            });
        }

        req.user = {
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || (userData.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'customer')
        };

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Lejárt vagy érvénytelen munkamenet." });
    }
}

/**
 * Adminisztrátori szerepkör kényszerítése
 */
async function requireAdmin(req, res, next) {
    await authenticate(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Hozzáférés megtagadva: Csak az adminisztrátor férhet hozzá ehhez a funkcióhoz!"
            });
        }
        next();
    });
}

module.exports = { authenticate, requireAdmin, ADMIN_EMAIL };