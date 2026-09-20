const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { db } = require('../config/firebase');
const simplePayService = require('../services/simplepay.service');
const { createBillingoInvoice } = require('../services/billingo.service');
const emailService = require('../services/email.service');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("KRITIKUS: JWT_SECRET hiányzik a környezeti változókbból!");
}

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Túl sok fizetési kérés indult, kérjük próbálja meg később!" }
});

const SHIPPING_CONFIG = {
    courier: { name: 'MPL Házhozszállítás', price: 1990 },
    parcel: { name: 'MPL Csomagautomata / PostaPont', price: 990 },
    pickup: { name: 'Személyes átvétel', price: 0 }
};
const FREE_SHIPPING_LIMIT = 15000;

function extractOptionalUser(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// 1. Fizetés inicializálása
router.post('/create-payment', paymentLimiter, async (req, res) => {
    try {
        const { items, customer, note, shippingMethod, wantsEmailNotification } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
            return res.status(400).json({ success: false, message: "Érvénytelen rendelési kosár." });
        }

        if (!customer || typeof customer !== 'object') {
            return res.status(400).json({ success: false, message: "Hiányzó vevői adatok." });
        }

        const { name, email, phone, zip, city, address, company, taxNumber } = customer;

        // E-mail ellenőrzés
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email.trim()) || email.length > 150) {
            return res.status(400).json({ success: false, message: "Érvénytelen e-mail cím." });
        }

        // Név ellenőrzés
        if (!name || name.trim().split(/\s+/).length < 2 || name.trim().length > 100) {
            return res.status(400).json({ success: false, message: "Kérjük, adja meg teljes nevét!" });
        }

        // Telefonszám ellenőrzés
        const cleanPhone = String(phone || '').replace(/[\s\-()]/g, "");
        const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;
        if (!huPhoneRegex.test(cleanPhone)) {
            return res.status(400).json({ success: false, message: "Érvénytelen telefonszám formátum." });
        }

        // Irányítószám ellenőrzés
        if (!zip || !/^\d{4}$/.test(String(zip).trim())) {
            return res.status(400).json({ success: false, message: "Érvénytelen 4 számjegyű irányítószám." });
        }

        // Település és cím ellenőrzés
        if (!city || city.trim().length < 2 || city.trim().length > 50) {
            return res.status(400).json({ success: false, message: "Érvénytelen település név." });
        }

        if (!address || address.trim().length < 3 || address.trim().length > 120) {
            return res.status(400).json({ success: false, message: "Érvénytelen utca és házszám." });
        }

        // Céges adatok ellenőrzése, ha megadták
        let cleanTaxNumber = "";
        let cleanCompany = "";
        if (company && company.trim().length > 0) {
            cleanCompany = company.trim().slice(0, 100);
            if (!taxNumber) {
                return res.status(400).json({ success: false, message: "Céges vásárlásnál az adószám megadása kötelező!" });
            }
            const digitsOnlyTax = String(taxNumber).replace(/[\s\-]/g, "");
            if (!/^\d{8}$|^\d{11}$/.test(digitsOnlyTax)) {
                return res.status(400).json({ success: false, message: "Érvénytelen adószám formátum!" });
            }
            cleanTaxNumber = String(taxNumber).trim().slice(0, 30);
        }

        const sanitizedCustomer = {
            name: name.trim().slice(0, 100),
            email: email.trim().toLowerCase().slice(0, 150),
            phone: cleanPhone,
            zip: String(zip).trim(),
            city: city.trim().slice(0, 50),
            address: address.trim().slice(0, 120),
            company: cleanCompany,
            taxNumber: cleanTaxNumber
        };

        const optionalUser = extractOptionalUser(req);

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

            const rawQty = parseInt(item.qty, 10);
            if (isNaN(rawQty) || rawQty < 1 || rawQty > 100) {
                return res.status(400).json({ success: false, message: "Érvénytelen darabszám." });
            }

            const officialUnitPrice = productData.arak[item.size];
            const lineTotal = officialUnitPrice * rawQty;
            itemsTotal += lineTotal;

            verifiedItems.push({
                productId: item.id,
                name: `${productData.cim} (${item.size}-os üveg)`,
                cim: `${productData.cim} (${item.size}-os üveg)`,
                unitPrice: officialUnitPrice,
                price: officialUnitPrice,
                quantity: rawQty,
                qty: rawQty,
                unit: "db",
                total: lineTotal
            });
        }

        const chosenShippingKey = SHIPPING_CONFIG[shippingMethod] ? shippingMethod : 'courier';
        const shippingOption = SHIPPING_CONFIG[chosenShippingKey];

        let shippingFee = shippingOption.price;
        let isFreeShipping = false;

        if (chosenShippingKey === 'pickup' || itemsTotal >= FREE_SHIPPING_LIMIT) {
            shippingFee = 0;
            isFreeShipping = true;
        }

        const finalTotalAmount = itemsTotal + shippingFee;
        const orderRef = `MM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        await db.collection('orders').doc(orderRef).set({
            orderRef,
            userId: optionalUser ? optionalUser.id : null,
            items: verifiedItems,
            itemsTotal,
            shipping: {
                methodKey: chosenShippingKey,
                name: shippingOption.name,
                price: shippingFee,
                isFree: isFreeShipping
            },
            customer: sanitizedCustomer,
            note: note ? String(note).trim().slice(0, 300) : "",
            totalAmount: finalTotalAmount,
            wantsEmailNotification: wantsEmailNotification !== false,
            status: 'PENDING',
            invoiceStatus: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const returnUrl = `${baseUrl}/api/simplepay-back`;

        const spData = await simplePayService.startTransaction(orderRef, finalTotalAmount, sanitizedCustomer, returnUrl);

        if (spData?.paymentUrl) {
            return res.json({ success: true, paymentUrl: spData.paymentUrl });
        } else {
            return res.status(500).json({ success: false, message: "Nem sikerült a SimplePay fizetés indítása." });
        }
    } catch (err) {
        console.error("Hiba a fizetés előkészítésekor:", err);
        res.status(500).json({ success: false, message: "Belső hiba történt a fizetés indításakor." });
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
            orderRef = encodeURIComponent(decoded.o || "");
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
            console.warn("⚠️ Érvénytelen SimplePay IPN aláírás érkezett!");
            return res.status(403).send("INVALID_SIGNATURE");
        }

        const ipnData = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);

        if (!ipnData.orderRef) {
            return res.status(400).send("MISSING_ORDER_REF");
        }

        const orderDocRef = db.collection('orders').doc(ipnData.orderRef);
        const orderDoc = await orderDocRef.get();

        if (orderDoc.exists && ipnData.status === 'FINISHED') {
            const order = orderDoc.data();

            if (order.status !== 'PAID') {
                const paidOrderData = {
                    ...order,
                    status: 'PAID',
                    transactionId: ipnData.transactionId || null,
                    paidAt: new Date().toISOString()
                };

                await orderDocRef.update({
                    status: 'PAID',
                    transactionId: paidOrderData.transactionId,
                    paidAt: paidOrderData.paidAt
                });

                // 1. Számlázás Billingo-val és auditálás
                const billingoResult = await createBillingoInvoice(paidOrderData);
                if (billingoResult.success) {
                    await orderDocRef.update({
                        invoiceStatus: 'CREATED',
                        invoiceNumber: billingoResult.invoiceNumber,
                        invoiceId: billingoResult.invoiceId
                    });
                } else {
                    await orderDocRef.update({
                        invoiceStatus: 'FAILED',
                        invoiceError: billingoResult.error || 'Ismeretlen számlázási hiba'
                    });
                }

                // 2. Automatikus e-mail visszaigazolás küldése
                if (paidOrderData.wantsEmailNotification !== false) {
                    await emailService.sendOrderConfirmation(paidOrderData);
                }
            }
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