const crypto = require('crypto');
const { db } = require('../config/firebase');

// Mez es uveg brutto tomegek meretenkent (kg)
const WEIGHT_PER_SIZE = {
    "250g": 0.45,
    "500g": 0.80,
    "900g": 1.35
};

// Doboz es terkitolto vedocsomagolas alaptomege (kg)
const BOX_BASE_WEIGHT = 0.35;

// Valos MPL sulyhatárok es brutto arszintek
const SHIPPING_CONFIG = {
    courier: {
        name: 'MPL Hazhozszallitas',
        maxWeight: 100,
        rates: [
            { maxKg: 2, price: 1990 },
            { maxKg: 5, price: 2490 },
            { maxKg: 10, price: 2990 },
            { maxKg: 20, price: 3990 },
            { maxKg: 30, price: 5490 },
            { maxKg: 999, price: 7990 }
        ]
    },
    parcel: {
        name: 'MPL Csomagautomata / PostaPont',
        maxWeight: 20,
        rates: [
            { maxKg: 2, price: 990 },
            { maxKg: 5, price: 1490 },
            { maxKg: 10, price: 1990 },
            { maxKg: 20, price: 2790 }
        ]
    },
    pickup: {
        name: 'Szemelyes atvetel (Alfold)',
        maxWeight: 9999,
        rates: [
            { maxKg: 9999, price: 0 }
        ]
    }
};

const FREE_SHIPPING_LIMIT = 18000;
const FULL_FREE_SHIPPING_LIMIT = 35000;
const STANDARD_SHIPPING_DISCOUNT = 2990;

class OrderService {
    async verifyAndCalculateItems(items) {
        const productsSnapshot = await db.collection('products').get();
        const dbProducts = {};
        productsSnapshot.forEach(doc => {
            dbProducts[doc.id] = doc.data();
        });

        let itemsTotal = 0;
        let itemsNetWeight = 0;
        const verifiedItems = [];

        for (const item of items) {
            const productData = dbProducts[item.id];
            if (!productData || !productData.arak || !productData.arak[item.size]) {
                throw new Error(`Ervenytelen termek vagy kiszereles: ${item.cim || item.id}`);
            }

            const rawQty = parseInt(item.qty, 10);
            if (isNaN(rawQty) || rawQty < 1 || rawQty > 100) {
                throw new Error("Ervenytelen darabszam.");
            }

            const officialUnitPrice = productData.arak[item.size];
            const lineTotal = officialUnitPrice * rawQty;
            itemsTotal += lineTotal;

            const unitGrossWeight = WEIGHT_PER_SIZE[item.size] || 1.35;
            itemsNetWeight += unitGrossWeight * rawQty;

            verifiedItems.push({
                productId: item.id,
                size: item.size,
                name: `${productData.cim} (${item.size}-os uveg)`,
                cim: `${productData.cim} (${item.size}-os uveg)`,
                unitPrice: officialUnitPrice,
                price: officialUnitPrice,
                quantity: rawQty,
                qty: rawQty,
                weightKg: Math.round(unitGrossWeight * 100) / 100,
                unit: "db",
                total: lineTotal
            });
        }

        const totalWeightKg = Math.round((itemsNetWeight + BOX_BASE_WEIGHT) * 10) / 10;

        return { verifiedItems, itemsTotal, totalWeightKg };
    }

    calculateShipping(shippingMethod, itemsTotal, totalWeightKg) {
        let chosenMethod = SHIPPING_CONFIG[shippingMethod] ? shippingMethod : 'courier';

        if (chosenMethod === 'parcel' && totalWeightKg > SHIPPING_CONFIG.parcel.maxWeight) {
            chosenMethod = 'courier';
        }

        const option = SHIPPING_CONFIG[chosenMethod];

        let baseShippingPrice = 0;
        for (const tier of option.rates) {
            if (totalWeightKg <= tier.maxKg) {
                baseShippingPrice = tier.price;
                break;
            }
        }

        let discount = 0;
        let finalShippingPrice = baseShippingPrice;
        let isFree = false;

        if (chosenMethod === 'pickup') {
            finalShippingPrice = 0;
            discount = 0;
            isFree = true;
        } else if (itemsTotal >= FULL_FREE_SHIPPING_LIMIT) {
            discount = baseShippingPrice;
            finalShippingPrice = 0;
            isFree = true;
        } else if (itemsTotal >= FREE_SHIPPING_LIMIT) {
            discount = Math.min(baseShippingPrice, STANDARD_SHIPPING_DISCOUNT);
            finalShippingPrice = Math.max(0, baseShippingPrice - discount);
            isFree = (finalShippingPrice === 0);
        }

        return {
            methodKey: chosenMethod,
            name: `${option.name} (${totalWeightKg} kg)`,
            rawName: option.name,
            price: finalShippingPrice,
            basePrice: baseShippingPrice,
            discount: discount,
            weightKg: totalWeightKg,
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
            totalWeightKg: shipping.weightKg,
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