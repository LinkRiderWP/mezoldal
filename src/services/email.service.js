const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        const host = process.env.SMTP_HOST;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass }
            });
            console.log("✅ E-mail értesítő szolgáltatás készen áll.");
        } else {
            console.warn("⚠️ SMTP adatok nincsenek beállítva (.env). Szimulált e-mail küldés aktív.");
            this.transporter = null;
        }
    }

    async sendOrderConfirmation(order) {
        if (!order || !order.customer || !order.customer.email) return;

        const customerEmail = order.customer.email;
        const customerName = order.customer.name || 'Kedves Vásárlónk';
        const fromAddress = process.env.EMAIL_FROM || '"Mikló Méhészet" <info@miklomez.hu>';

        const itemsRows = order.items.map(item => `
            <tr style="border-bottom: 1px solid #3A281E;">
                <td style="padding: 10px; color: #F5EFE6;">${item.name || item.cim}</td>
                <td style="padding: 10px; text-align: center; color: #F5EFE6;">${item.qty || item.quantity} db</td>
                <td style="padding: 10px; text-align: right; color: #E5A93C; font-weight: bold;">${(item.price * (item.qty || item.quantity)).toLocaleString('hu-HU')} Ft</td>
            </tr>
        `).join('');

        const shippingRow = order.shipping ? `
            <tr style="border-bottom: 1px solid #3A281E;">
                <td style="padding: 10px; color: #C0B0A0;">Szállítás: ${order.shipping.name}</td>
                <td style="padding: 10px; text-align: center; color: #C0B0A0;">1 db</td>
                <td style="padding: 10px; text-align: right; color: #E5A93C; font-weight: bold;">${order.shipping.price === 0 ? 'Ingyenes' : `${order.shipping.price.toLocaleString('hu-HU')} Ft`}</td>
            </tr>
        ` : '';

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="hu">
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; background-color: #120A05; color: #F5EFE6; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background-color: #1F140D; border: 1px solid #E5A93C; border-radius: 12px; padding: 25px; }
                .header { text-align: center; border-bottom: 2px solid #E5A93C; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { color: #E5A93C; margin: 0; font-size: 24px; }
                .order-box { background-color: #2B1D14; border-radius: 8px; padding: 15px; margin: 15px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { text-align: left; padding: 8px; color: #C0B0A0; font-size: 13px; border-bottom: 2px solid #3A281E; }
                .total-row { font-size: 18px; color: #E5A93C; font-weight: bold; text-align: right; padding-top: 15px; }
                .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #8C7D70; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Mikló Méhészet</h1>
                    <p style="color: #C0B0A0; margin: 5px 0 0;">Rendelés visszaigazolása</p>
                </div>

                <p>Kedves <strong>${customerName}</strong>!</p>
                <p>Köszönjük megrendelését! A(z) <strong>${order.orderRef}</strong> számú rendelés kifizetése sikeresen megtörtént.</p>

                <div class="order-box">
                    <p style="margin: 0 0 5px;"><strong>Szállítási adatok:</strong></p>
                    <p style="margin: 0; color: #C0B0A0;">${order.customer.zip} ${order.customer.city}, ${order.customer.address}</p>
                    <p style="margin: 5px 0 0; color: #C0B0A0;">Telefonszám: ${order.customer.phone}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Tétel</th>
                            <th style="text-align: center;">Mennyiség</th>
                            <th style="text-align: right;">Ár</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                        ${shippingRow}
                    </tbody>
                </table>

                <div class="total-row">
                    Fizetett végösszeg: ${Number(order.totalAmount).toLocaleString('hu-HU')} Ft
                </div>

                <p style="margin-top: 20px; font-size: 13px; color: #C0B0A0;">
                    A hivatalos Billingo e-számlát a rendszerünk külön e-mailben is továbbítja.
                </p>

                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Mikló Méhészet</p>
                </div>
            </div>
        </body>
        </html>
        `;

        if (!this.transporter) {
            console.log(`[MOCK EMAIL KÜLDÉS] Címzett: ${customerEmail} | Rendelés: ${order.orderRef}`);
            return;
        }

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: customerEmail,
                subject: `Sikeres rendelés: ${order.orderRef} – Mikló Méhészet`,
                html: htmlContent
            });
            console.log(`✅ Értesítő e-mail sikeresen elküldve: ${customerEmail}`);
        } catch (error) {
            console.error(`❌ Hiba az e-mail küldésekor (${customerEmail}):`, error);
        }
    }
}

module.exports = new EmailService();