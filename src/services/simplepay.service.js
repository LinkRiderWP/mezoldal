const crypto = require('crypto');
const fetch = require('node-fetch');

class SimplePayService {
    constructor() {
        this.merchant = process.env.SIMPLEPAY_MERCHANT;
        this.secretKey = process.env.SIMPLEPAY_SECRET_KEY;
        this.isSandbox = process.env.SIMPLEPAY_SANDBOX === 'true';
        this.apiUrl = this.isSandbox
            ? 'https://sandbox.simplepay.hu/payment/v2/start'
            : 'https://secure.simplepay.hu/payment/v2/start';
    }

    calculateSignature(data) {
        return crypto.createHmac('sha384', (this.secretKey || '').trim())
            .update(typeof data === 'string' ? data : JSON.stringify(data))
            .digest('base64');
    }

    verifySignature(rawBody, receivedSignature) {
        const expectedSignature = this.calculateSignature(rawBody);
        return expectedSignature === receivedSignature;
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