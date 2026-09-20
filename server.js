require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));
app.use(express.urlencoded({ extended: true }));

// Statikus fájlok
app.use(express.static(path.join(__dirname, 'public')));

// Útvonalak
app.use('/api', paymentRoutes);

app.listen(PORT, () => {
    console.log(`Mikló Méhészet szerver aktív: http://localhost:${PORT}`);
});