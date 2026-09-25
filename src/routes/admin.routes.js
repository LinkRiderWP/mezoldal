// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../config/firebase');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Feltöltési mappa előkészítése
const uploadDir = path.join(__dirname, '../../public/kepek/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer beállítása lemezre mentéssel és biztonsági szűrőkkel
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'mez-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const mime = file.mimetype;
        if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
            cb(null, true);
        } else {
            cb(new Error("Csak képformátum tölthető fel (JPG, PNG, WEBP)!"));
        }
    }
});

// Minden ezen router alá tartozó végpontot védi a requireAdmin
router.use(requireAdmin);

// 1. Admin jogosultság tesztelése
router.get('/check', (req, res) => {
    res.json({ success: true, user: req.user });
});

// 2. Kép feltöltése a szerverre
router.post('/upload-image', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Feltöltési hiba: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Nem érkezett képfájl." });
        }

        const relativePath = `kepek/uploads/${req.file.filename}`;
        return res.status(200).json({
            success: true,
            filePath: relativePath,
            message: "Kép sikeresen feltöltve!"
        });
    });
});

// 3. Elérhető képek listázása (Képtár választóhoz)
router.get('/images', (req, res) => {
    try {
        const baseKepekDir = path.join(__dirname, '../../public/kepek');
        const images = [];

        if (fs.existsSync(baseKepekDir)) {
            const rootFiles = fs.readdirSync(baseKepekDir);
            rootFiles.forEach(file => {
                if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
                    images.push(`kepek/${file}`);
                }
            });
        }

        if (fs.existsSync(uploadDir)) {
            const uploadedFiles = fs.readdirSync(uploadDir);
            uploadedFiles.forEach(file => {
                if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
                    images.push(`kepek/uploads/${file}`);
                }
            });
        }

        return res.json({ success: true, images });
    } catch (err) {
        console.error("Hiba a képek listázásakor:", err);
        return res.status(500).json({ success: false, message: "Nem sikerült lekérni a képtárat." });
    }
});

// 4. Összes megrendelés lekérése
router.get('/orders', async (req, res) => {
    try {
        const snapshot = await db.collection('orders').get();
        const orders = [];
        snapshot.forEach(doc => {
            orders.push(doc.data());
        });

        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.json({ success: true, orders });
    } catch (err) {
        console.error("Hiba a rendelések lekérésekor:", err);
        return res.status(500).json({ success: false, message: "Hiba történt a rendelések betöltésekor." });
    }
});

// 5. Új méz felvétele a kínálatba
router.post('/products', async (req, res) => {
    try {
        const { id, cim, leiras, kep, price250, price500, price900, isSale, discountPercentage, bulkPrice } = req.body;

        if (!cim || !price250 || !price500 || !price900) {
            return res.status(400).json({ success: false, message: "A név és az árak megadása kötelező!" });
        }

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
            nagy_tetel_ar: bulkPrice ? bulkPrice.trim() : "Egyedi árajánlat alapján",
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

// 6. Méz törlése a kínálatból
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