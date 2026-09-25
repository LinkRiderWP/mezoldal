// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Minden ezen router alá tartozó végpontot védi a requireAdmin
router.use(requireAdmin);

// 1. Admin jogosultság tesztelése
router.get('/check', (req, res) => {
    res.json({ success: true, user: req.user });
});

// 2. Összes megrendelés lekérése
router.get('/orders', async (req, res) => {
    try {
        const snapshot = await db.collection('orders').get();
        const orders = [];
        snapshot.forEach(doc => {
            orders.push(doc.data());
        });

        // Dátum szerinti csökkenő sorrend (legfrissebb elöl)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({ success: true, orders });
    } catch (err) {
        console.error("Hiba a rendelések lekérésekor:", err);
        return res.status(500).json({ success: false, message: "Hiba történt a rendelések betöltésekor." });
    }
});

// 3. Új méz felvétele a kínálatba
router.post('/products', async (req, res) => {
    try {
        const { id, cim, leiras, kep, price250, price500, price900, isSale, discountPercentage, nagy_tetel_ar } = req.body;

        if (!cim || !price250 || !price500 || !price900) {
            return res.status(400).json({ success: false, message: "A név és az árak megadása kötelező!" });
        }

        // Egyedi azonosító (slug) generálása
        const cleanId = (id && id.trim().length > 0)
            ? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
            : cim.toLowerCase().trim()
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
            .replace(/ó|ö|ő/g, 'o').replace(/ú|ü|ű/g, 'u')
            .replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);

        const newProduct = {
            id: cleanId,
            cim: cim.trim(),
            leiras: leiras ? leiras.trim() : "",
            kep: kep ? kep.trim() : "kepek/mez.jpg",
            arak: {
                "250g": Number(price250),
                "500g": Number(price500),
                "900g": Number(price900)
            },
            isSale: Boolean(isSale),
            discountPercentage: Number(discountPercentage) || 0,
            nagy_tetel_ar: nagy_tetel_ar ? nagy_tetel_ar.trim() : "Egyedi árajánlat alapján",
            nagy_tetel_minimum: "min. 10 kg",
            updatedAt: new Date().toISOString()
        };

        await db.collection('products').doc(cleanId).set(newProduct);

        return res.status(201).json({
            success: true,
            product: newProduct,
            message: `"${newProduct.cim}" sikeresen rögzítve a kínálatban!`
        });
    } catch (err) {
        console.error("Hiba a termék hozzáadásakor:", err);
        return res.status(500).json({ success: false, message: "Nem sikerült hozzáadni a mézet a kínálathoz." });
    }
});

// 4. Méz törlése a kínálatból
router.delete('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(400).json({ success: false, message: "Hiányzó termékazonosító!" });
        }

        const docRef = db.collection('products').doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "A megadott termék nem található!" });
        }

        await docRef.delete();

        return res.json({
            success: true,
            message: `A(z) "${doc.data().cim || productId}" termék sikeresen törölve a kínálatból!`
        });
    } catch (err) {
        console.error("Hiba a termék törlésekor:", err);
        return res.status(500).json({ success: false, message: "Hiba történt a törlés során." });
    }
});

module.exports = router;