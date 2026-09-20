const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const huPhoneRegex = /^(?:\+36|06)(?:1|20|30|70|52|53|54|33|34|36|37|42|44|45|46|47|48|49|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)\d{6,7}$/;

function validatePaymentPayload(req, res, next) {
    const { items, customer, company, taxNumber } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ success: false, message: "Érvénytelen rendelési kosár." });
    }

    if (!customer || typeof customer !== 'object') {
        return res.status(400).json({ success: false, message: "Hiányzó vevői adatok." });
    }

    const { name, email, phone, zip, city, address } = customer;

    if (!email || !emailRegex.test(email.trim()) || email.length > 150) {
        return res.status(400).json({ success: false, message: "Érvénytelen e-mail cím." });
    }

    if (!name || name.trim().split(/\s+/).length < 2 || name.trim().length > 100) {
        return res.status(400).json({ success: false, message: "Kérjük, adja meg teljes nevét!" });
    }

    const cleanPhone = String(phone || '').replace(/[\s\-()]/g, "");
    if (!huPhoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: "Érvénytelen telefonszám formátum." });
    }

    if (!zip || !/^\d{4}$/.test(String(zip).trim())) {
        return res.status(400).json({ success: false, message: "Érvénytelen 4 számjegyű irányítószám." });
    }

    if (!city || city.trim().length < 2 || city.trim().length > 50) {
        return res.status(400).json({ success: false, message: "Érvénytelen település név." });
    }

    if (!address || address.trim().length < 3 || address.trim().length > 120) {
        return res.status(400).json({ success: false, message: "Érvénytelen utca és házszám." });
    }

    let cleanTaxNumber = "";
    let cleanCompany = "";
    if (customer.company && customer.company.trim().length > 0) {
        cleanCompany = customer.company.trim().slice(0, 100);
        if (!customer.taxNumber) {
            return res.status(400).json({ success: false, message: "Céges vásárlásnál az adószám megadása kötelező!" });
        }
        const digitsOnlyTax = String(customer.taxNumber).replace(/[\s\-]/g, "");
        if (!/^\d{8}$|^\d{11}$/.test(digitsOnlyTax)) {
            return res.status(400).json({ success: false, message: "Érvénytelen adószám formátum!" });
        }
        cleanTaxNumber = String(customer.taxNumber).trim().slice(0, 30);
    }

    // Tisztított és normalizált adat átadása a következő lépésnek
    req.sanitizedCustomer = {
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 150),
        phone: cleanPhone,
        zip: String(zip).trim(),
        city: city.trim().slice(0, 50),
        address: address.trim().slice(0, 120),
        company: cleanCompany,
        taxNumber: cleanTaxNumber
    };

    next();
}

module.exports = { validatePaymentPayload };