// src/routes/product.routes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

const defaultProducts = [
    {
        id: "napraforgomez",
        cim: "Napraforgó méz",
        leiras: "Intenzív aranysárga színű, gazdag ízvilágú különlegesség...",
        kep: "kepek/mez.jpg",
        arak: { "250g": 990, "500g": 1790, "900g": 2890 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "2000 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "akacmez",
        cim: "Akácméz",
        leiras: "Világos színű, lágy ízű mézkülönlegesség...",
        kep: "kepek/akacmez.jpg",
        arak: { "250g": 1890, "500g": 2590, "900g": 3500 },
        discountPercentage: 25,
        isSale: true,
        nagy_tetel_ar: "2750 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "repcemez",
        cim: "Repceméz",
        leiras: "Krémes állagú, enyhén fanyar ízű méz...",
        kep: "kepek/repcemez.jpg",
        arak: { "250g": 1190, "500g": 1990, "900g": 2500 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "1900 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "harsmez",
        cim: "Hársméz",
        leiras: "Erőteljes, rendkívül aromás, fűszeres illatú...",
        kep: "kepek/harsmez.jpg",
        arak: { "250g": 1490, "500g": 2290, "900g": 3100 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "2400 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    }
];

router.get('/products', async (req, res) => {
    try {
        const snapshot = await db.collection('products').get();
        if (snapshot.empty) {
            // Automatikus inicializálás
            for (const p of defaultProducts) {
                await db.collection('products').doc(p.id).set(p);
            }
            return res.json({ success: true, products: defaultProducts });
        }

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        return res.json({ success: true, products });
    } catch (err) {
        console.error("Termékek lekérési hibája:", err);
        return res.status(500).json({ success: false, message: "Nem sikerült betölteni a termékeket." });
    }
});

module.exports = router;