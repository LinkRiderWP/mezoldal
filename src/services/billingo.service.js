const fetch = require('node-fetch');

async function createBillingoInvoice(order) {
    const apiKey = process.env.BILLINGO_API_KEY;
    const blockId = parseInt(process.env.BILLINGO_BLOCK_ID, 10);

    if (!apiKey || !blockId) {
        console.warn("⚠️ Billingo API kulcs vagy Block ID nincs konfigurálva a .env-ben.");
        return { success: false, reason: "BILLINGO_NOT_CONFIGURED" };
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Tételek összeállítása
    const items = (order.items || []).map(item => ({
        name: item.name || item.cim,
        unit_price: Number(item.price || item.unitPrice),
        unit_price_type: "gross",
        quantity: Number(item.qty || item.quantity || 1),
        unit: "db",
        vat: "AAM",
        comment: "Kézműves magyar méz"
    }));

    // 2. Szállítási díj tétel súlymegjelöléssel
    if (order.shipping && Number(order.shipping.price) > 0) {
        const weightLabel = order.totalWeightKg ? ` - ${order.totalWeightKg} kg` : '';
        items.push({
            name: `Kiszállítási díj (${order.shipping.rawName || order.shipping.name}${weightLabel})`,
            unit_price: Number(order.shipping.price),
            unit_price_type: "gross",
            quantity: 1,
            unit: "db",
            vat: "AAM",
            comment: "MPL szállítási szolgáltatás (törésbiztos csomagolásban)"
        });
    }

    // Partner adatok előkészítése
    const partnerPayload = {
        name: order.customer.company || order.customer.name,
        address: {
            country_code: "HU",
            post_code: String(order.customer.zip),
            city: order.customer.city,
            address: order.customer.address
        },
        emails: [order.customer.email]
    };

    // Csak céges partner esetén küldünk adószámot
    if (order.customer.taxNumber && order.customer.taxNumber.trim().length > 0) {
        partnerPayload.taxcode = order.customer.taxNumber.trim();
    }

    const invoicePayload = {
        partner: partnerPayload,
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
            const invoiceNumber = result.invoice_number || String(result.id);
            console.log(`✅ Billingo számla elkészült! Szám: ${invoiceNumber}`);
            return {
                success: true,
                invoiceId: result.id,
                invoiceNumber: invoiceNumber
            };
        } else {
            console.error("❌ Billingo API válaszhiva:", result);
            return {
                success: false,
                error: result.message || "Billingo hiba",
                details: result
            };
        }
    } catch (err) {
        console.error("❌ Billingo lekérési kivétel:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { createBillingoInvoice };