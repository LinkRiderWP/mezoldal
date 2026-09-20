const crypto = require('crypto');
const fetch = require('node-fetch');

class SimplePayService {
    constructor() {
        this.merchant = process.env.SIMPLEPAY_MERCHANT;
        this.secretKey = (process.env.SIMPLEPAY_SECRET_KEY || '').trim();
        this.isSandbox = process.env.SIMPLEPAY_SANDBOX === 'true';
        this.apiUrl = this.isSandbox
            ? 'https://sandbox.simplepay.hu/payment/v2/start'
            : 'https://secure.simplepay.hu/payment/v2/start';
    }

    calculateSignature(data) {
        if (!this.secretKey) {
            throw new Error("SIMPLEPAY_SECRET_KEY nincs beállítva a szerveren!");
        }
        return crypto.createHmac('sha384', this.secretKey)
            .update(typeof data === 'string' ? data : JSON.stringify(data))
            .digest('base64');
    }

    verifySignature(rawBody, receivedSignature) {
        if (!this.secretKey || !receivedSignature || !rawBody) {
            return false;
        }

        try {
            const expectedSignature = this.calculateSignature(rawBody);
            const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
            const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

            if (expectedBuffer.length !== receivedBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
        } catch (e) {
            console.error("Aláírás-hitelesítési hiba:", e);
            return false;
        }
    }

    async startTransaction(orderRef, totalAmount, customer, returnUrl) {
        const payload = {
            salt: crypto.randomBytes(16).toString('hex'),
            merchant: this.merchant,
            orderRef: orderRef,
            currency: "HUF",
            customerEmail: customer.email,
            language: "HU",
            total: totalAmount,
            methods: ["CARD"],
            url: returnUrl,
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

        const signature = this.calculateSignature(payload);

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Signature': signature
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    }
}

module.exports = new SimplePayService();