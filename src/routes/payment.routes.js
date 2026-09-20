const express = require('express');
const router = express.Router();
const ordersDb = require('../config/db');
const simplePayService = require('../services/simplepay.service');
const { createBillingoInvoice } = require('../services/billingo.service');

// 1. Fizetés inicializálása
router.post('/create-payment', async (req, res) => {
    try {
        const { items, customer, note } = req.body;
        if (!items?.length || !customer?.email) {
            return res.status(400).json({ success: false, message: "Hiányos rendelési adatok." });
        }

        const orderRef = 'MM-' + Date.now();
        const totalAmount = items.reduce((sum, it) => sum + (it.price * it.qty), 0);

        ordersDb.set(orderRef, {
            orderRef, items, customer, note, totalAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const returnUrl = `${baseUrl}/api/simplepay-back`;

        const spData = await simplePayService.startTransaction(orderRef, totalAmount, customer, returnUrl);

        if (spData?.paymentUrl) {
            return res.json({ success: true, paymentUrl: spData.paymentUrl });
        } else {
            return res.status(500).json({ success: false, message: "Nem sikerült a SimplePay fizetés indítása." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Visszatérés a SimplePay oldaláról
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
        const order = ordersDb.get(ipnData.orderRef);

        if (order && ipnData.status === 'FINISHED') {
            order.status = 'PAID';
            order.transactionId = ipnData.transactionId;
            await createBillingoInvoice(order);
        }

        const responsePayload = JSON.stringify(ipnData);
        const respSignature = simplePayService.calculateSignature(responsePayload);

        res.set({ 'Content-Type': 'application/json', 'Signature': respSignature });
        return res.status(200).send(responsePayload);
    } catch (err) {
        res.status(500).send("SERVER_ERROR");
    }
});

module.exports = router;