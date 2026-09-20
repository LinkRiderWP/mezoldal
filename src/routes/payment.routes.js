const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const simplePayService = require('../services/simplepay.service');
const { createBillingoInvoice } = require('../services/billingo.service');

// Hivatalos szállítási konfiguráció a szerveren (manipulálhatatlan)
const SHIPPING_CONFIG = {
    courier: { name: 'MPL Házhozszállítás', price: 1990 },
    parcel: { name: 'MPL Csomagautomata / PostaPont', price: 990 },
    pickup: { name: 'Személyes átvétel', price: 0 }
};
const FREE_SHIPPING_LIMIT = 15000;

// 1. Fizetés inicializálása - VÉDETT ÁRKÉPZÉSSEL ÉS SZÁLLÍTÁSSAL
router.post('/create-payment', async (req, res) => {
    try {
        const { items, customer, note, shippingMethod } = req.body;
        if (!items?.length || !customer?.email) {
            return res.status(400).json({ success: false, message: "Hiányos rendelési adatok." });
        }

        // --- 1. TERMÉKÁRAK HITELÍTÉSE FIREBASE-BŐL ---
        let itemsTotal = 0;
        const verifiedItems = [];

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
            const officialUnitPrice = productData.arak[item.size];
            const lineTotal = officialUnitPrice * qty;
            itemsTotal += lineTotal;

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

        // --- 2. SZÁLLÍTÁSI DÍJ SZERVEROLDALI HITELÍTÉSE ---
        const chosenShippingKey = SHIPPING_CONFIG[shippingMethod] ? shippingMethod : 'courier';
        const shippingOption = SHIPPING_CONFIG[chosenShippingKey];

        let shippingFee = shippingOption.price;
        let isFreeShipping = false;

        if (chosenShippingKey === 'pickup' || itemsTotal >= FREE_SHIPPING_LIMIT) {
            shippingFee = 0;
            isFreeShipping = true;
        }

        const finalTotalAmount = itemsTotal + shippingFee;
        const orderRef = 'MM-' + Date.now();

        // Rendelés elmentése a Firebase Firestore-ba
        await db.collection('orders').doc(orderRef).set({
            orderRef,
            items: verifiedItems,
            itemsTotal,
            shipping: {
                methodKey: chosenShippingKey,
                name: shippingOption.name,
                price: shippingFee,
                isFree: isFreeShipping
            },
            customer,
            note: note || "",
            totalAmount: finalTotalAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const returnUrl = `${baseUrl}/api/simplepay-back`;

        // SimplePay tranzakció indítása a golyóálló végösszeggel
        const spData = await simplePayService.startTransaction(orderRef, finalTotalAmount, customer, returnUrl);

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

// 3. SimplePay IPN webhook
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

            await orderDocRef.update({
                status: 'PAID',
                transactionId: ipnData.transactionId,
                paidAt: new Date().toISOString()
            });

            // Számla kiállítása a szállítási tétellel együtt
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