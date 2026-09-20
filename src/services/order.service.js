const crypto = require('crypto');
const { db } = require('../config/firebase');

const SHIPPING_CONFIG = {
    courier: { name: 'MPL Házhozszállítás', price: 1990 },
    parcel: { name: 'MPL Csomagautomata / PostaPont', price: 990 },
    pickup: { name: 'Személyes átvétel', price: 0 }
};
const FREE_SHIPPING_LIMIT = 15000;

class OrderService {
    async verifyAndCalculateItems(items) {
        const productsSnapshot = await db.collection('products').get();
        const dbProducts = {};
        productsSnapshot.forEach(doc => {
            dbProducts[doc.id] = doc.data();
        });

        let itemsTotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const productData = dbProducts[item.id];
            if (!productData || !productData.arak || !productData.arak[item.size]) {
                throw new Error(`Érvénytelen termék vagy kiszerelés: ${item.cim || item.id}`);
            }

            const rawQty = parseInt(item.qty, 10);
            if (isNaN(rawQty) || rawQty < 1 || rawQty > 100) {
                throw new Error("Érvénytelen darabszám.");
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

        return { verifiedItems, itemsTotal };
    }

    calculateShipping(shippingMethod, itemsTotal) {
        const chosenShippingKey = SHIPPING_CONFIG[shippingMethod] ? shippingMethod : 'courier';
        const shippingOption = SHIPPING_CONFIG[chosenShippingKey];
        const isFree = chosenShippingKey === 'pickup' || itemsTotal >= FREE_SHIPPING_LIMIT;

        return {
            methodKey: chosenShippingKey,
            name: shippingOption.name,
            price: isFree ? 0 : shippingOption.price,
            isFree
        };
    }

    async saveNewOrder({ orderRef, userId, verifiedItems, itemsTotal, shipping, customer, note, wantsEmailNotification }) {
        const totalAmount = itemsTotal + shipping.price;

        const orderData = {
            orderRef,
            userId,
            items: verifiedItems,
            itemsTotal,
            shipping,
            customer,
            note: note ? String(note).trim().slice(0, 300) : "",
            totalAmount,
            wantsEmailNotification: wantsEmailNotification !== false,
            status: 'PENDING',
            invoiceStatus: 'PENDING',
            createdAt: new Date().toISOString()
        };

        await db.collection('orders').doc(orderRef).set(orderData);
        return orderData;
    }
}

module.exports = new OrderService();