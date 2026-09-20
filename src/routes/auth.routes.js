const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'miklo_default_jwt_secret_dev_2026';

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
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, phone, zip, city, address, company, taxNumber, wantsEmailNotification } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: "A név, e-mail cím és jelszó megadása kötelező!" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "A jelszónak legalább 6 karakternek kell lennie!" });
        }

        const normalizedEmail = email.toLowerCase().trim();
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
            phone: phone ? phone.trim() : "",
            zip: zip ? zip.trim() : "",
            city: city ? city.trim() : "",
            address: address ? address.trim() : "",
            company: company ? company.trim() : "",
            taxNumber: taxNumber ? taxNumber.trim() : "",
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
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Kérjük adja meg e-mail címét és jelszavát!" });
        }

        const normalizedEmail = email.toLowerCase().trim();
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
            .where('customer.email', '==', user.email)
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

// 4. Értesítési beállítás frissítése
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