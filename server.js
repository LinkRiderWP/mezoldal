require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Mentett tranzakciók (memóriában, élesben célszerű adatbázisba tenni)
const ordersDb = new Map();

app.use(cors());
// Raw body kezelése az IPN híváshoz a signature ellenőrzés miatt
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));
app.use(express.urlencoded({ extended: true }));

// Statikus fájlok kiszolgálása (HTML, CSS, JS, képek)
app.use(express.static(path.join(__dirname)));

// SimplePay segédfüggvény: HMAC-SHA384 hash készítése
function calculateSimplePaySignature(data, secretKey) {
    return crypto.createHmac('sha384', secretKey.trim())
        .update(typeof data === 'string' ? data : JSON.stringify(data))
        .digest('base64');
}

/**
 * 1. FIZETÉS INDÍTÁSA (SimplePay v2.1 API)
 */
app.post('/api/create-payment', async (req, res) => {
    try {
        const { items, customer, note } = req.body;

        if (!items || !items.length || !customer || !customer.email) {
            return res.status(400).json({ success: false, message: "Hiányos rendelési adatok." });
        }

        const orderRef = 'MM-' + Date.now();
        const totalAmount = items.reduce((sum, it) => sum + (it.price * it.qty), 0);

        // Tranzakció mentése a memóriába
        ordersDb.set(orderRef, {
            orderRef,
            items,
            customer,
            note,
            totalAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const isSandbox = process.env.SIMPLEPAY_SANDBOX === 'true';
        const simplepayUrl = isSandbox
            ? 'https://sandbox.simplepay.hu/payment/v2/start'
            : 'https://secure.simplepay.hu/payment/v2/start';

        const merchant = process.env.SIMPLEPAY_MERCHANT;
        const secretKey = process.env.SIMPLEPAY_SECRET_KEY;

        const payload = {
            salt: crypto.randomBytes(16).toString('hex'),
            merchant: merchant,
            orderRef: orderRef,
            currency: "HUF",
            customerEmail: customer.email,
            language: "HU",
            total: totalAmount,
            methods: ["CARD"],
            url: `${BASE_URL}/api/simplepay-back`,
            invoice: {
                name: customer.name,
                company: customer.company || "",
                country: "HU",
                state: customer.city,
                city: customer.city,
                zip: customer.zip,
                address: customer.address
            },
            timeout: new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '+01:00')
        };

        const signature = calculateSimplePaySignature(payload, secretKey);

        const spResponse = await fetch(simplepayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Signature': signature
            },
            body: JSON.stringify(payload)
        });

        const spData = await spResponse.json();

        if (spData && spData.paymentUrl) {
            return res.json({ success: true, paymentUrl: spData.paymentUrl });
        } else {
            console.error("SimplePay hiba:", spData);
            return res.status(500).json({ success: false, message: "Nem sikerült a fizetést inicializálni." });
        }
    } catch (err) {
        console.error("Payment init exception:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * 2. VÁSÁRLÓ VISSZATÉRÉSE A SIKERES/SIKERTELEN FIZETÉS UTÁN
 */
app.get('/api/simplepay-back', (req, res) => {
    const r = req.query.r; // SimplePay base64 válasza
    let isSuccess = false;
    let orderRef = "";

    if (r) {
        try {
            const decoded = JSON.parse(Buffer.from(r, 'base64').toString('utf8'));
            orderRef = decoded.o;
            isSuccess = (decoded.e === 'SUCCESS');
        } catch (e) {
            console.error("Hiba a SimplePay válasz dekódolásakor:", e);
        }
    }

    if (isSuccess) {
        res.redirect(`/?payment=success&order=${orderRef}#contact`);
    } else {
        res.redirect(`/?payment=failed&order=${orderRef}#contact`);
    }
});

/**
 * 3. SIMPLEPAY IPN ÉRTESÍTÉS ÉS AUTOMATIKUS BILLINGO SZÁMLÁZÁS
 */
app.post('/api/simplepay-ipn', async (req, res) => {
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const receivedSignature = req.headers['signature'];
        const secretKey = process.env.SIMPLEPAY_SECRET_KEY;

        const expectedSignature = calculateSimplePaySignature(rawBody, secretKey);

        if (receivedSignature !== expectedSignature) {
            console.warn("Érvénytelen SimplePay IPN aláírás!");
            return res.status(403).send("INVALID_SIGNATURE");
        }

        const ipnData = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
        const orderRef = ipnData.orderRef;
        const order = ordersDb.get(orderRef);

        if (order && ipnData.status === 'FINISHED') {
            order.status = 'PAID';
            order.transactionId = ipnData.transactionId;

            // Billingo számla automatikus kiállítása
            await createBillingoInvoice(order);
        }

        // A SimplePay kötelező válasza az IPN-re: a kapott törzs visszaküldése friss aláírással
        const responsePayload = JSON.stringify(ipnData);
        const respSignature = calculateSimplePaySignature(responsePayload, secretKey);

        res.set({
            'Content-Type': 'application/json',
            'Signature': respSignature
        });
        return res.status(200).send(responsePayload);

    } catch (err) {
        console.error("IPN exception:", err);
        res.status(500).send("SERVER_ERROR");
    }
});

/**
 * BILLINGO v3 API SZÁMLA GENERÁLÁS
 */
async function createBillingoInvoice(order) {
    const apiKey = process.env.BILLINGO_API_KEY;
    const blockId = parseInt(process.env.BILLINGO_BLOCK_ID, 10);

    if (!apiKey || !blockId) {
        console.warn("Billingo nincs konfigurálva a .env fájlban.");
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const items = order.items.map(item => ({
        name: item.cim,
        unit_price: item.price,
        unit_price_type: "gross",
        quantity: item.qty,
        unit: "db",
        vat: "AAM", // Alanyi Adómentes őstermelő/KATA esetén. Ha 27%-os áfakörös, írja: "27%"
        comment: "Kézműves magyar méz"
    }));

    const invoicePayload = {
        partner: {
            name: order.customer.company || order.customer.name,
            address: {
                country_code: "HU",
                post_code: String(order.customer.zip),
                city: order.customer.city,
                address: order.customer.address
            },
            emails: [order.customer.email],
            taxcode: order.customer.taxNumber || ""
        },
        block_id: blockId,
        type: "invoice",
        fulfillment_date: today,
        due_date: today,
        payment_method: "simplepay",
        language: "hu",
        currency: "HUF",
        conversion_rate: 1,
        electronic: true,
        paid: true,
        items: items,
        settings: {
            send_email: true
        }
    };

    try {
        const response = await fetch('https://api.billingo.hu/v3/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify(invoicePayload)
        });

        const result = await response.json();
        if (response.ok) {
            console.log(`Billingo számla sikeresen kiállítva! Számlaszám: ${result.invoice_number || result.id}`);
        } else {
            console.error("Billingo hiba:", result);
        }
    } catch (err) {
        console.error("Billingo lekérési kivétel:", err);
    }
}

app.listen(PORT, () => {
    console.log(`Mikló Méhészet szerver elindult a ${BASE_URL} címen.`);
});