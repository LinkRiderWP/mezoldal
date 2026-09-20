const fetch = require('node-fetch');

async function createBillingoInvoice(order) {
    const apiKey = process.env.BILLINGO_API_KEY;
    const blockId = parseInt(process.env.BILLINGO_BLOCK_ID, 10);

    if (!apiKey || !blockId) {
        console.warn("Billingo API adatok nincsenek konfigurálva a .env-ben.");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const items = order.items.map(item => ({
        name: item.cim,
        unit_price: item.price,
        unit_price_type: "gross",
        quantity: item.qty,
        unit: "db",
        vat: "AAM",
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
        settings: { send_email: true }
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
            console.log(`Billingo számla elkészült! Szám: ${result.invoice_number || result.id}`);
        } else {
            console.error("Billingo API hiba:", result);
        }
    } catch (err) {
        console.error("Billingo lekérési kivétel:", err);
    }
}

module.exports = { createBillingoInvoice };