/*
  Delivery zones in Lagos and their fees.

    Mainland   ₦3,000
    Island     ₦5,000
    Outskirts  ₦6,000   (Badagry, Epe, Ikorodu, Ibeju-Lekki...)

  The fees above are the defaults. The admin can change them on the dashboard;
  the current fees are stored in the Setting "deliveryFees". The fee in force at
  checkout is saved on the order, so later changes never alter an order already placed.

  To add or move an area, edit the lists below.
*/

const Setting = require("../models/setting");

const ZONES = [
    {
        id: "mainland",
        label: "Lagos Mainland",
        defaultFee: 3000,
        areas: [
            "Abule Egba", "Agege", "Ajegunle", "Akoka", "Alausa", "Alimosho", "Amuwo-Odofin", "Anthony",
            "Apapa", "Bariga", "Berger", "Ebute Metta", "Egbeda", "Ejigbo", "Festac", "Gbagada",
            "Idimu", "Ifako-Ijaiye", "Igando", "Iju-Ishaga", "Ikeja", "Ikeja GRA", "Ikosi", "Ikotun",
            "Ilupeju", "Ipaja", "Isolo", "Iyana Ipaja", "Ketu", "Magodo", "Maryland", "Mile 2",
            "Mushin", "Ogba", "Ogudu", "Ojo", "Ojodu", "Ojota", "Okota", "Oshodi", "Palmgrove",
            "Satellite Town", "Shomolu", "Surulere", "Yaba"
        ]
    },
    {
        id: "island",
        label: "Lagos Island",
        defaultFee: 5000,
        areas: [
            "Abraham Adesanya", "Agungi", "Ajah", "Badore", "Banana Island", "Chevron", "Eko Atlantic",
            "Idumota", "Ikate", "Ikoyi", "Jakande", "Lagos Island", "Lekki Phase 1", "Marina",
            "Obalende", "Oniru", "Osapa London", "Sangotedo", "Victoria Island"
        ]
    },
    {
        id: "outskirts",
        label: "Lagos outskirts",
        defaultFee: 6000,
        areas: [
            "Agbara", "Awoyaya", "Badagry", "Bogije", "Epe", "Ibeju-Lekki", "Igbogbo", "Ijanikin",
            "Ijede", "Ikorodu", "Imota", "Lakowe", "Morogbo"
        ]
    }
];

// "Another area" choice at the end of each zone
const OTHER = "Other";

async function currentFees() {

    const saved = await Setting.findById("deliveryFees").lean();

    const fees = {};

    for (const zone of ZONES) {
        const value = Number(saved?.value?.[zone.id]);
        fees[zone.id] = Number.isFinite(value) && value >= 0 ? value : zone.defaultFee;
    }

    return fees;

}

async function saveFees(input) {

    const fees = {};

    for (const zone of ZONES) {

        const value = Number(input?.[zone.id]);

        if (!Number.isInteger(value) || value < 0 || value > 1000000) {
            const err = new Error(`Enter a whole naira amount for ${zone.label} (0 or more).`);
            err.status = 400;
            err.expose = true;
            throw err;
        }

        fees[zone.id] = value;

    }

    await Setting.updateOne({ _id: "deliveryFees" }, { $set: { value: fees } }, { upsert: true });

    return fees;

}

/* What the checkout page shows: zones, their fees and areas */
async function options() {

    const fees = await currentFees();

    return ZONES.map((zone) => ({ id: zone.id, label: zone.label, fee: fees[zone.id], areas: zone.areas }));

}

/*
  Checks a customer's choice. Returns { zone, zoneLabel, area, fee } or null.
  area is one of the zone's listed areas, or "Other" (an area in that zone that isn't listed).
*/
async function quote(zoneId, area) {

    const zone = ZONES.find((z) => z.id === zoneId);

    if (!zone) return null;

    const name = String(area || "").trim();

    const listed = zone.areas.find((a) => a.toLowerCase() === name.toLowerCase());

    if (!listed && name !== OTHER) return null;

    const fees = await currentFees();

    return {
        zone: zone.id,
        zoneLabel: zone.label,
        area: listed || `Other (${zone.label})`,
        fee: fees[zone.id]
    };

}

module.exports = { ZONES, OTHER, currentFees, saveFees, options, quote };
