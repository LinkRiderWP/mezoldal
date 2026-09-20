// src/config/firebase.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
        console.error("❌ Érvénytelen JSON formátum a FIREBASE_SERVICE_ACCOUNT_JSON környezeti változóban!");
        process.exit(1);
    }
} else {
    const keyPath = path.resolve(__dirname, '../../firebase-service-account.json');
    if (!fs.existsSync(keyPath)) {
        console.error(`❌ HIÁNYZÓ KULCS: Nem található a Firebase kulcsfájl: ${keyPath}`);
        console.error("Kérjük helyezze el a fájlt, vagy állítsa be a FIREBASE_SERVICE_ACCOUNT_JSON környezeti változót!");
        process.exit(1);
    }
    try {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (e) {
        console.error("❌ Nem sikerült beolvasni a firebase-service-account.json fájlt:", e.message);
        process.exit(1);
    }
}

let app;
if (getApps().length === 0) {
    app = initializeApp({
        credential: cert(serviceAccount)
    });
    console.log("✅ Firebase Admin sikeresen csatlakoztatva.");
} else {
    app = getApps()[0];
}

const db = getFirestore(app);

module.exports = { db };