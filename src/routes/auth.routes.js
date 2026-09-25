const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { db } = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("KRITIKUS: JWT_SECRET hiányzik a környezeti változókból!");
}

// Sebességkorlátozás bejelentkezésre és regisztrációra
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Túl sok próbálkozás ebből a hálózatból. Kérjük várjon 15 percet!" },
    standardHeaders: true,
    legacyHeaders: false
});

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// Token hitelesítő middleware
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

// 1. Regisztráció
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { email, password, name, phone, zip, city, address, company, taxNumber, wantsEmailNotification } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: "A név, e-mail cím és jelszó megadása kötelező!" });
        }

        if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
            return res.status(400).json({ success: false, message: "A jelszónak legalább 6 karakternek kell lennie!" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = email.toLowerCase().trim();
        if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 150) {
            return res.status(400).json({ success: false, message: "Érvénytelen e-mail cím formátum!" });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({ success: false, message: "A név nem haladhatja meg a 100 karaktert!" });
        }

        const usersRef = db.collection('users');
        const existing = await usersRef.where('email', '==', normalizedEmail).get();

        if (!existing.empty) {
            return res.status(400).json({ success: false, message: "Ezzel az e-mail címmel már létezik fiók!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserRef = usersRef.doc();

        const userData = {
            id: newUserRef.id,
            email: normalizedEmail,
            password: hashedPassword,
            name: name.trim(),
            phone: phone ? String(phone).trim().slice(0, 30) : "",
            zip: zip ? String(zip).trim().slice(0, 10) : "",
            city: city ? String(city).trim().slice(0, 50) : "",
            address: address ? String(address).trim().slice(0, 100) : "",
            company: company ? String(company).trim().slice(0, 100) : "",
            taxNumber: taxNumber ? String(taxNumber).trim().slice(0, 30) : "",
            wantsEmailNotification: wantsEmailNotification !== false,
            createdAt: new Date().toISOString()
        };

        await newUserRef.set(userData);

        const token = generateToken(userData);
        delete userData.password;

        return res.status(201).json({
            success: true,
            token,
            user: userData,
            message: "Sikeres regisztráció!"
        });
    } catch (error) {
        console.error("Regisztrációs hiba:", error);
        return res.status(500).json({ success: false, message: "Hiba történt a regisztráció során." });
    }
});

// 2. Bejelentkezés
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: "Kérjük adja meg e-mail címét és jelszavát!" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', normalizedEmail).limit(1).get();

        if (snapshot.empty) {
            return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó!" });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó!" });
        }

        const token = generateToken(user);
        delete user.password;

        return res.json({
            success: true,
            token,
            user,
            message: `Üdvözöljük, ${user.name}!`
        });
    } catch (error) {
        console.error("Bejelentkezési hiba:", error);
        return res.status(500).json({ success: false, message: "Hiba történt a bejelentkezéskor." });
    }
});

// 3. Bejelentkezett profil & rendelési előzmények
router.get('/me', authenticate, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "Felhasználó nem található." });
        }

        const user = userDoc.data();
        delete user.password;

        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', req.user.id)
            .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push(doc.data());
        });

        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({ success: true, user, orders });
    } catch (error) {
        console.error("Profil lekérési hiba:", error);
        return res.status(500).json({ success: false, message: "Nem sikerült lekérni a profilt." });
    }
});

// 4. Mentett szállítási / számlázási adatok módosítása
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, phone, zip, city, address, company, taxNumber } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: "A név megadása kötelező!" });
        }

        const updatedData = {
            name: name.trim().slice(0, 100),
            phone: phone ? String(phone).trim().slice(0, 30) : "",
            zip: zip ? String(zip).trim().slice(0, 10) : "",
            city: city ? String(city).trim().slice(0, 50) : "",
            address: address ? String(address).trim().slice(0, 100) : "",
            company: company ? String(company).trim().slice(0, 100) : "",
            taxNumber: taxNumber ? String(taxNumber).trim().slice(0, 30) : "",
            updatedAt: new Date().toISOString()
        };

        const userDocRef = db.collection('users').doc(req.user.id);
        await userDocRef.update(updatedData);

        const freshDoc = await userDocRef.get();
        const freshUser = freshDoc.data();
        delete freshUser.password;

        return res.json({
            success: true,
            user: freshUser,
            message: "A profiladatok sikeresen mentve lettek!"
        });
    } catch (error) {
        console.error("Profil módosítási hiba:", error);
        return res.status(500).json({ success: false, message: "Nem sikerült frissíteni a profiladatokat." });
    }
});

// 5. Jelszó módosítása
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Kérjük adja meg jelenlegi és új jelszavát!" });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Az új jelszónak legalább 6 karakter hosszúnak kell lennie!" });
        }

        const userDocRef = db.collection('users').doc(req.user.id);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "Felhasználó nem található." });
        }

        const user = userDoc.data();
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "A megadott jelenlegi jelszó helytelen!" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await userDocRef.update({
            password: hashedNewPassword,
            passwordUpdatedAt: new Date().toISOString()
        });

        return res.json({ success: true, message: "Jelszava sikeresen megváltoztatva!" });
    } catch (error) {
        console.error("Jelszócsere hiba:", error);
        return res.status(500).json({ success: false, message: "Nem sikerült módosítani a jelszót." });
    }
});

// 6. Értesítési beállítás frissítése
router.put('/preferences', authenticate, async (req, res) => {
    try {
        const { wantsEmailNotification } = req.body;
        if (typeof wantsEmailNotification !== 'boolean') {
            return res.status(400).json({ success: false, message: "Érvénytelen beállítási érték." });
        }

        await db.collection('users').doc(req.user.id).update({ wantsEmailNotification });
        return res.json({ success: true, message: "Értesítési beállítás frissítve!" });
    } catch (error) {
        console.error("Preferencia hiba:", error);
        return res.status(500).json({ success: false, message: "Nem sikerült frissíteni a beállítást." });
    }
});

module.exports = router;