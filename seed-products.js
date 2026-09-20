// seed-products.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

let app;
if (getApps().length === 0) {
    app = initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    app = getApps()[0];
}

const db = getFirestore(app);

const initialProducts = [
    {
        id: "napraforgomez",
        cim: "Napraforgó méz",
        leiras: "Intenzív aranysárga színű, gazdag ízvilágú különlegesség...",
        arak: { "250g": 990, "500g": 1790, "900g": 2890 }
    },
    {
        id: "akacmez",
        cim: "Akácméz",
        leiras: "Világos színű, lágy ízű mézkülönlegesség...",
        arak: { "250g": 1890, "500g": 2590, "900g": 3500 }
    },
    {
        id: "repcemez",
        cim: "Repceméz",
        leiras: "Krémes állagú, enyhén fanyar ízű méz...",
        arak: { "250g": 1190, "500g": 1990, "900g": 2500 }
    },
    {
        id: "harsmez",
        cim: "Hársméz",
        leiras: "Erőteljes, rendkívül aromás, fűszeres illatú...",
        arak: { "250g": 1490, "500g": 2290, "900g": 3100 }
    }
];

async function runSeed() {
    console.log("Termékek feltöltése a Firebase Firestore-ba...");
    for (const prod of initialProducts) {
        await db.collection('products').doc(prod.id).set(prod, { merge: true });
        console.log(`✅ Sikeresen feltöltve: ${prod.cim} (${prod.id})`);
    }
    console.log("🎉 Minden méz bekerült a Firebase adatbázisba!");
    process.exit(0);
}

runSeed().catch(err => {
    console.error("❌ Hiba a feltöltés során:", err);
    process.exit(1);
});