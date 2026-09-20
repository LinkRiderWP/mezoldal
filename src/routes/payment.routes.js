const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { db } = require('../config/firebase');
const simplePayService = require('../services/simplepay.service');
const orderService = require('../services/order.service');
const { createBillingoInvoice } = require('../services/billingo.service');
const emailService = require('../services/email.service');
const { validatePaymentPayload } = require('../middlewares/payment.validator');

const JWT_SECRET = process.env.JWT_SECRET;
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Túl sok fizetési kérés indult, kérjük próbálja meg később!" }
});

function extractOptionalUser(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        } catch {
            return null;
        }
    }
    return null;
}

// 1. Fizetés indítása
router.post('/create-payment', paymentLimiter, validatePaymentPayload, async (req, res) => {
    try {
        const { items, note, shippingMethod, wantsEmailNotification } = req.body;
        const customer = req.sanitizedCustomer;
        const optionalUser = extractOptionalUser(req);

        const { verifiedItems, itemsTotal } = await orderService.verifyAndCalculateItems(items);
        const shipping = orderService.calculateShipping(shippingMethod, itemsTotal);
        const orderRef = `MM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const order = await orderService.saveNewOrder({
            orderRef,
            userId: optionalUser ? optionalUser.id : null,
            verifiedItems,
            itemsTotal,
            shipping,
            customer,
            note,
            wantsEmailNotification
        });

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const returnUrl = `${baseUrl}/api/simplepay-back`;

        const spData = await simplePayService.startTransaction(orderRef, order.totalAmount, customer, returnUrl);

        if (spData?.paymentUrl) {
            return res.json({ success: true, paymentUrl: spData.paymentUrl });
        }
        return res.status(500).json({ success: false, message: "Nem sikerült a SimplePay fizetés indítása." });
    } catch (err) {
        console.error("Hiba a fizetés előkészítésekor:", err);
        res.status(400).json({ success: false, message: err.message || "Hiba történt a fizetés során." });
    }
});

// 2. Visszatérés a SimplePay oldaláról
router.get('/simplepay-back', (req, res) => {
    let isSuccess = false;
    let orderRef = "";

    if (req.query.r) {
        try {
            const decoded = JSON.parse(Buffer.from(req.query.r, 'base64').toString('utf8'));
            orderRef = encodeURIComponent(decoded.o || "");
            isSuccess = (decoded.e === 'SUCCESS');
        } catch (e) {
            console.error("SimplePay visszatérési hiba:", e);
        }
    }
    res.redirect(`/?payment=${isSuccess ? 'success' : 'failed'}&order=${orderRef}#contact`);
});

// 3. SimplePay IPN Webhook
router.post('/simplepay-ipn', async (req, res) => {
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = req.headers['signature'];

        if (!simplePayService.verifySignature(rawBody, signature)) {
            return res.status(403).send("INVALID_SIGNATURE");
        }

        const ipnData = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
        if (!ipnData.orderRef) return res.status(400).send("MISSING_ORDER_REF");

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

                // Számla kiállítása
                const billingoResult = await createBillingoInvoice(paidOrderData);
                await orderDocRef.update(
                    billingoResult.success
                        ? { invoiceStatus: 'CREATED', invoiceNumber: billingoResult.invoiceNumber, invoiceId: billingoResult.invoiceId }
                        : { invoiceStatus: 'FAILED', invoiceError: billingoResult.error || 'Számlázási hiba' }
                );

                // E-mail küldése
                if (paidOrderData.wantsEmailNotification !== false) {
                    await emailService.sendOrderConfirmation(paidOrderData);
                }
            }
        }

        const responseData = {
            ...ipnData,
            receiveDate: new Date().toISOString().replace(/\.\d{3}Z$/, '+01:00')
        };
        const responsePayload = JSON.stringify(responseData);
        const respSignature = simplePayService.calculateSignature(responsePayload);

        res.set({ 'Content-Type': 'application/json', 'Signature': respSignature });
        return res.status(200).send(responsePayload);
    } catch (err) {
        console.error("IPN hiba:", err);
        res.status(500).send("SERVER_ERROR");
    }
});

module.exports = router;