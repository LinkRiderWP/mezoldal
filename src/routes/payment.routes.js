const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const simplePayService = require('../services/simplepay.service');
const { createBillingoInvoice } = require('../services/billingo.service');

// 1. Fizetés inicializálása - VÉDETT ÁRKÉPZÉSSEL
router.post('/create-payment', async (req, res) => {
    try {
        const { items, customer, note } = req.body;
        if (!items?.length || !customer?.email) {
            return res.status(400).json({ success: false, message: "Hiányos rendelési adatok." });
        }

        // --- SZERVEROLDALI ÁRVÉDELEM (FIREBASE) KEZDETE ---
        let calculatedTotal = 0;
        const verifiedItems = [];

        // Lekérjük a termékeket a Firebase Firestore 'products' gyűjteményéből
        const productsSnapshot = await db.collection('products').get();
        const dbProducts = {};
        productsSnapshot.forEach(doc => {
            dbProducts[doc.id] = doc.data();
        });

        for (const item of items) {
            const productData = dbProducts[item.id];
            if (!productData || !productData.arak || !productData.arak[item.size]) {
                return res.status(400).json({
                    success: false,
                    message: `Érvénytelen termék vagy kiszerelés: ${item.cim || item.id}`
                });
            }

            const qty = Math.max(1, parseInt(item.qty, 10) || 1);
            // KIZÁRÓLAG a Firebase-ből származó hiteles árat vesszük figyelembe:
            const officialUnitPrice = productData.arak[item.size];
            const lineTotal = officialUnitPrice * qty;
            calculatedTotal += lineTotal;

            verifiedItems.push({
                productId: item.id,
                name: `${productData.cim} (${item.size}-os üveg)`,
                cim: `${productData.cim} (${item.size}-os üveg)`,
                unitPrice: officialUnitPrice,
                price: officialUnitPrice,
                quantity: qty,
                qty: qty,
                unit: "db",
                total: lineTotal
            });
        }
        // --- SZERVEROLDALI ÁRVÉDELEM VÉGE ---

        const orderRef = 'MM-' + Date.now();

        // Rendelés elmentése Firebase Firestore-ba (perzisztens, szerver újrainduláskor sem vész el!)
        await db.collection('orders').doc(orderRef).set({
            orderRef,
            items: verifiedItems,
            customer,
            note: note || "",
            totalAmount: calculatedTotal,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const returnUrl = `${baseUrl}/api/simplepay-back`;

        // A SimplePay-nek a szerver által kiszámolt és védett összeget adjuk át!
        const spData = await simplePayService.startTransaction(orderRef, calculatedTotal, customer, returnUrl);

        if (spData?.paymentUrl) {
            return res.json({ success: true, paymentUrl: spData.paymentUrl });
        } else {
            return res.status(500).json({ success: false, message: "Nem sikerült a SimplePay fizetés indítása." });
        }
    } catch (err) {
        console.error("Hiba a fizetés előkészítésekor:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Visszatérés a SimplePay felületről
router.get('/simplepay-back', (req, res) => {
    const r = req.query.r;
    let isSuccess = false;
    let orderRef = "";

    if (r) {
        try {
            const decoded = JSON.parse(Buffer.from(r, 'base64').toString('utf8'));
            orderRef = decoded.o;
            isSuccess = (decoded.e === 'SUCCESS');
        } catch (e) {
            console.error("SimplePay visszatérési hiba:", e);
        }
    }
    res.redirect(`/?payment=${isSuccess ? 'success' : 'failed'}&order=${orderRef}#contact`);
});

// 3. SimplePay IPN webhook (Firebase frissítés & Számlázás)
router.post('/simplepay-ipn', async (req, res) => {
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = req.headers['signature'];

        if (!simplePayService.verifySignature(rawBody, signature)) {
            return res.status(403).send("INVALID_SIGNATURE");
        }

        const ipnData = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
        const orderDocRef = db.collection('orders').doc(ipnData.orderRef);
        const orderDoc = await orderDocRef.get();

        if (orderDoc.exists && ipnData.status === 'FINISHED') {
            const order = orderDoc.data();

            // Státusz frissítése Firebase-ben PAID-re
            await orderDocRef.update({
                status: 'PAID',
                transactionId: ipnData.transactionId,
                paidAt: new Date().toISOString()
            });

            // Billingo számla automatikus kiállítása
            await createBillingoInvoice(order);
        }

        const responsePayload = JSON.stringify(ipnData);
        const respSignature = simplePayService.calculateSignature(responsePayload);

        res.set({ 'Content-Type': 'application/json', 'Signature': respSignature });
        return res.status(200).send(responsePayload);
    } catch (err) {
        console.error("IPN hiba:", err);
        res.status(500).send("SERVER_ERROR");
    }
});

module.exports = router;