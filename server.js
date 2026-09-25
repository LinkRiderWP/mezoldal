require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const paymentRoutes = require('./src/routes/payment.routes');
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const adminRoutes = require('./src/routes/admin.routes');

if (!process.env.JWT_SECRET) {
    console.error("❌ KRITIKUS HIBA: A JWT_SECRET környezeti változó hiányzik a .env fájlból!");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

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

const allowedOrigins = process.env.BASE_URL ? [process.env.BASE_URL] : [];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Nem engedélyezett forrás (CORS hiba)'));
        }
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

app.listen(PORT, () => {
    console.log(`✅ Mikló Méhészet szerver aktív: http://localhost:${PORT}`);
});