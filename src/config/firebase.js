// src/config/firebase.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, '../../firebase-service-account.json');

if (!fs.existsSync(keyPath)) {
    console.error(`❌ HIÁNYZÓ KULCS: Nem található a fájl: ${keyPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Csak akkor inicializáljuk, ha még nincs aktív Firebase app
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