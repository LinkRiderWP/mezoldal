// public/js/data/products.data.js
export const products = [
    {
        id: "napraforgomez",
        cim: "Napraforgó méz",
        leiras: "Intenzív aranysárga színű, gazdag ízvilágú különlegesség...",
        kep: "kepek/mez.jpg",
        arak: { "250g": 990, "500g": 1790, "900g": 2890 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "2000 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "akacmez",
        cim: "Akácméz",
        leiras: "Világos színű, lágy ízű mézkülönlegesség...",
        kep: "kepek/akacmez.jpg",
        arak: { "250g": 1890, "500g": 2590, "900g": 3500 },
        discountPercentage: 25,
        isSale: true,
        nagy_tetel_ar: "2750 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "repcemez",
        cim: "Repceméz",
        leiras: "Krémes állagú, enyhén fanyar ízű méz...",
        kep: "kepek/repcemez.jpg",
        arak: { "250g": 1190, "500g": 1990, "900g": 2500 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "1900 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    },
    {
        id: "harsmez",
        cim: "Hársméz",
        leiras: "Erőteljes, rendkívül aromás, fűszeres illatú...",
        kep: "kepek/harsmez.jpg",
        arak: { "250g": 1490, "500g": 2290, "900g": 3100 },
        discountPercentage: 0,
        isSale: false,
        nagy_tetel_ar: "2400 Ft / kg",
        nagy_tetel_minimum: "min. 10 kg"
    }
];