// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = 'miklomeheszet@gmail.com';

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Hiányzó vagy érvénytelen token." });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Lejárt vagy érvénytelen munkamenet." });
    }
}

function requireAdmin(req, res, next) {
    authenticate(req, res, () => {
        if (!req.user || !req.user.email || req.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Hozzáférés megtagadva: Csak az adminisztrátor férhet hozzá ehhez a funkcióhoz!"
            });
        }
        next();
    });
}

module.exports = { authenticate, requireAdmin, ADMIN_EMAIL };