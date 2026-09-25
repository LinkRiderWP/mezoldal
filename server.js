// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const paymentRoutes = require('./src/routes/payment.routes');
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const adminRoutes = require('./src/routes/admin.routes');

// Indításkori konfigurációs ellenőrzések
if (!process.env.JWT_SECRET) {
    console.error("❌ KRITIKUS HIBA: A JWT_SECRET környezeti változó hiányzik a .env fájlból!");
    process.exit(1);
}

if (!process.env.SIMPLEPAY_SECRET_KEY) {
    console.warn("⚠️ FIGYELEM: A SIMPLEPAY_SECRET_KEY nincs beállítva. A bankkártyás fizetések nem fognak működni!");
}

const app = express();
const PORT = process.env.PORT || 3000;

// BIZTONSÁG: Reverse proxy (Cloudflare, Nginx, Render) mögötti kliens IP kezelése rate limitinghez
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS konfiguráció ellenőrzött forrásokkal és biztonságos hibakezeléssel
const allowedOrigins = [process.env.BASE_URL].filter(Boolean).map(url => url.replace(/\/$/, ''));
app.use(cors({
    origin: (origin, callback) => {
        // Ha nincs origin fejléc (azonos eredetű kérés, közvetlen böngészőnavigáció vagy cURL)
        if (!origin) return callback(null, true);

        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Hiba dobása helyett csendesen megtagadjuk a CORS engedélyezést
        return callback(null, false);
    },
    credentials: true
}));

app.use(express.json({
    limit: '200kb',
    verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

// Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, 'public')));

// API Útvonalak
app.use('/api', paymentRoutes);
app.use('/api', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Globális Express hibakezelő middleware
app.use((err, req, res, next) => {
    console.error("Váratlan szerverhiba:", err);
    res.status(500).json({ success: false, message: "Belső szerverhiba történt." });
});

app.listen(PORT, () => {
    console.log(`✅ Mikló Méhészet szerver aktív: http://localhost:${PORT}`);
});