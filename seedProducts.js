require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Product = require("./models/product");

const products = [

    // =========================
    // NIKE
    // =========================

    {
        name: "Nike Air Force 1 Mid QS",
        variant: "Air Force 1",
        brand: "Nike",
        price: 50000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Mid QS.png",
        inStock: true
    },

    {
        name: "Nike Air Force 1 Low Billie",
        variant: "Air Force 1",
        brand: "Nike",
        price: 95000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Low Billie.png",
        inStock: true
    },

    {
        name: "Nike Air Force 1 Premium",
        variant: "Air Force 1",
        brand: "Nike",
        price: 110000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Low-Premium.png",
        inStock: true
    },

    {
        name: "Nike Air Force 1 Mid Classic",
        variant: "Nike",
        brand: "Nike",
        price: 125000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Mid Classic.png",
        inStock: true
    },

    {
        name: "Nike Dunk Low Retro",
        variant: "Nike",
        brand: "Nike",
        price: 105000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Low-Retro.png",
        inStock: true
    },

    {
        name: "Nike Air Force 1 Evo",
        variant: "Nike",
        brand: "Nike",
        price: 115000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/AF1-Mid Evo.png",
        inStock: true
    },


    // =========================
    // ADIDAS
    // =========================

    {
        name: "Adidas Superstar",
        variant: "Adidas",
        brand: "Adidas",
        price: 85000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS SUPERSTAR.avif",
        inStock: true
    },

    {
        name: "Adidas Daily",
        variant: "Adidas",
        brand: "Adidas",
        price: 80000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Adidas Daily.avif",
        inStock: true
    },

    {
        name: "Adidas Ultraboost",
        variant: "Adidas",
        brand: "Adidas",
        price: 120000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS ULTRABOOST.avif",
        inStock: true
    },

    {
        name: "Adidas Duramo",
        variant: "Adidas",
        brand: "Adidas",
        price: 90000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS DURAMO.avif",
        inStock: true
    },

    {
        name: "Adidas Busenitz",
        variant: "White/Black",
        brand: "Adidas",
        price: 100000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Adidas Busenitz.avif",
        inStock: true
    },

    {
        name: "Adidas Gazelle",
        variant: "Adidas",
        brand: "Adidas",
        price: 90000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Adidas Gazelle.avif",
        inStock: true
    },

    {
        name: "Adidas UBounce",
        variant: "Adidas",
        brand: "Adidas",
        price: 105000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS UBounce.avif",
        inStock: true
    },

     {
        name: "Adidas Superstar",
        variant: "Adidas",
        brand: "Adidas",
        price: 105000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS SUPERSTAR.avif",
        inStock: true
    },

     {
        name: "Adidas Hoops",
        variant: "Adidas",
        brand: "Adidas",
        price: 105000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/ADIDAS HOOPS.avif",
        inStock: true
    },



    // =========================
    // PUMA
    // =========================

    {
        name: "Puma Suede XL Hairy",
        variant: "Puma",
        brand: "Puma",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Suede-XL-Hairy.avif",
        inStock: true
    },

    {
        name: "Puma Palermo Leather Classics",
        variant: "Puma",
        brand: "Puma",
        price: 90000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Palermo-Leather-Classics.avif",
        inStock: true
    },

    {
        name: "Puma Premier Court",
        variant: "Puma",
        brand: "Puma",
        price: 85000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Premier-Court.avif",
        inStock: true
    },

    {
        name: "Puma Nitro",
        variant: "Puma",
        brand: "Puma",
        price: 80000,
        sizes: [7, 8, 9, 10],
        image: "/images/NITRO.avif",
        inStock: true
    },

    {
        name: "Puma LOVE MARATHON",
        variant: "Puma",
        brand: "Puma",
        price: 88000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/LOVE-MARATHON.avif",
        inStock: true
    },

    {
        name: "Puma Easy Rider Vintage",
        variant: "Puma",
        brand: "Puma",
        price: 88000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/Easy-Rider-Vintage.avif",
        inStock: true
    },


    // =========================
    // NEW BALANCE
    // =========================

    {
        name: "New Balance 550",
        variant: "New Balance",
        brand: "New Balance",
        price: 90000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/NB 550.webp",
        inStock: true
    },

    {
        name: "New Balance 530",
        variant: "New Balance",
        brand: "New Balance",
        price: 85000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/NB 530.webp",
        inStock: true
    },

    {
        name: "New Balance 9060",
        variant: "New Balance",
        brand: "New Balance",
        price: 90000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/NB 9060.webp",
        inStock: true
    },

    {
        name: "New Balance Fresh-Foam X.webp",
        variant: "New Balance",
        brand: "New Balance",
        price: 125000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/NB Fresh-Foam X.webp",
        inStock: true
    },

    {
        name: "New Balance Rebel",
        variant: "New Balance",
        brand: "New Balance",
        price: 135000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/NB Rebel.webp",
        inStock: true
    },

    {
        name: "New Balance 990v4 Core",
        variant: "New Balance",
        brand: "New Balance",
        price: 135000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/990v4.webp",
        inStock: true
    },

    // =========================
    // AIR MAX
    // =========================

    {
        name: "Nike Air Max 1",
        variant: "AirMax",
        brand: "AirMax",
        price: 65000,
        sizes: [43, 44, 45],
        image: "/images/Nike Air-Max 1.png",
        inStock: true
    },

    {
        name: "Nike Air Max 90",
        variant: "AirMax",
        brand: "AirMax",
        price: 75000,
        sizes: [43, 44, 45],
        image: "/images/Air-Max 90.png",
        inStock: true
    },

    {
        name: "Nike Air Max DN",
        variant: "AirMax",
        brand: "AirMax",
        price: 90000,
        sizes: [43, 44, 45],
        image: "/images/Air-Max DN.png",
        inStock: true
    },

    {
        name: "Nike Air-Max DT 96",
        variant: "AirMax",
        brand: "AirMax",
        price: 95000,
        sizes: [43, 44, 45],
        image: "/images/Air-Max DT 96.png",
        inStock: true
    },

    {
        name: "Nike Air-Max Plus",
        variant: "AirMax",
        brand: "AirMax",
        price: 85000,
        sizes: [43, 44, 45],
        image: "/images/Air-Max Plus.png",
        inStock: true
    },

    {
        name: "Nike Air VaporMax",
        variant: "AirMax",
        brand: "AirMax",
        price: 105000,
        sizes: [43, 44, 45],
        image: "/images/Air-VaporMax.png",
        inStock: true
    },



    // =========================
    // VANS
    // =========================

    {
        name: "Vans Old Skool",
        variant: "Vans",
        brand: "Vans",
        price: 70000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/OLD-SKOOL.webp",
        inStock: true
    },

    {
        name: "Vans Sport Low",
        variant: "Vans",
        brand: "Vans",
        price: 65000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SPORT-LOW.webp",
        inStock: true
    },

    {
        name: "Vans KNU SKOOL",
        variant: "Vans",
        brand: "Vans",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/KNU-SKOOL.webp",
        inStock: true
    },

    {
        name: "Vans LowLand Leather",
        variant: "Vans",
        brand: "Vans",
        price: 40000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/LOWLAND-LEATHER.webp",
        inStock: true
    },

     {
        name: "Vans CRUZE-TOO",
        variant: "Vans",
        brand: "Vans",
        price: 70000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/CRUZE-TOO.webp",
        inStock: true
    },

     {
        name: "Vans LowLand Leather",
        variant: "Vans",
        brand: "Vans",
        price: 68000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SLIP-ON.webp",
        inStock: true
    },



    // =========================
    // SB Dunk
    // =========================

    {
        name: "Nike SB Blazer",
        variant: "Nike",
        brand: "Dunk",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB BLAZER.png",
        inStock: true
    },

    {
        name: "Nike SB Force",
        variant: "Nike",
        brand: "Dunk",
        price: 78000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB FORCE.png",
        inStock: true
    },

    {
        name: "Nike SB Pogo",
        variant: "Nike",
        brand: "Dunk",
        price: 95000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB POGO.png",
        inStock: true
    },

    {
        name: "Nike SB React",
        variant: "Nike",
        brand: "Dunk",
        price: 115000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB REACT.png",
        inStock: true
    },

    {
        name: "Nike SB Vertebrae",
        variant: "Nike",
        brand: "Dunk",
        price: 100000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB VERTEBRAE.png",
        inStock: true
    },

    {
        name: "Nike SB Zoom",
        variant: "Nike",
        brand: "Dunk",
        price: 110000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/SB ZOOM.png",
        inStock: true
    },



    // =========================
    // JORDANS
    // =========================

    {
        name: "Nike Air Jordan 1 Element",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J1 Element.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 1 Low Wave",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J1 Low Wave.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 1 Mid SE Craft",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J1 Mid SE Craft.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 1 Retro High",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J1 Retro High.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 3 Retro",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J3 Retro.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 4 Retro",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J4 Retro.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 6 Rings",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J6 Rings.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan 9 G",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/J9 G.png",
        inStock: true
    },

    {
        name: "Nike Air Jordan Jumpman MVP",
        variant: "Jordans",
        brand: "Jordans",
        price: 120000,
        sizes: [43, 44, 45],
        image: "/images/Jumpman-MVP.png",
        inStock: true
    },


    // =========================
    // FOR LATER UPDATE
    // =========================

    // =========================
    // SKECHERS
    // =========================

    {
        name: "Skechers Go Walk",
        variant: "Black",
        brand: "Skechers",
        price: 70000,
        sizes: [43, 44, 45],
        image: "/images/skechers-go-walk.jpg",
        inStock: true
    },

    {
        name: "Skechers D'Lites",
        variant: "White/Black",
        brand: "Skechers",
        price: 80000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/skechers-dlites.jpg",
        inStock: true
    },

    {
        name: "Skechers Max Cushioning",
        variant: "Grey/White",
        brand: "Skechers",
        price: 90000,
        sizes: [43, 44, 45],
        image: "/images/skechers-max-cushioning.jpg",
        inStock: true
    },

    {
        name: "Skechers Track",
        variant: "Black/Grey",
        brand: "Skechers",
        price: 65000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/skechers-track.jpg",
        inStock: true
    },

    // =========================
    // FILA
    // =========================

    {
        name: "Fila Disruptor II",
        variant: "White",
        brand: "Fila",
        price: 70000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/fila-disruptor-ii.jpg",
        inStock: true
    },

    {
        name: "Fila Ray Tracer",
        variant: "White/Grey",
        brand: "Fila",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/fila-ray-tracer.jpg",
        inStock: true
    },

    {
        name: "Fila Grant Hill",
        variant: "White/Black",
        brand: "Fila",
        price: 85000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/fila-grant-hill.jpg",
        inStock: true
    },

    // =========================
    // TIMBERLAND
    // =========================

    {
        name: "Timberland 6-Inch Premium Boot",
        variant: "Wheat",
        brand: "Timberland",
        price: 150000,
        sizes: [7, 43, 44, 45],
        image: "/images/timberland-6-inch.jpg",
        inStock: true
    },

    {
        name: "Timberland Bradstreet",
        variant: "Brown",
        brand: "Timberland",
        price: 125000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/timberland-bradstreet.jpg",
        inStock: true
    },

    {
        name: "Timberland Sprint Trekker",
        variant: "Black",
        brand: "Timberland",
        price: 130000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/timberland-sprint-trekker.jpg",
        inStock: true
    },

    // =========================
    // CROCS
    // =========================

    {
        name: "Crocs Classic Clog",
        variant: "Black",
        brand: "Crocs",
        price: 55000,
        sizes: [7, 43, 44, 45],
        image: "/images/crocs-classic-clog.jpg",
        inStock: true
    },

    {
        name: "Crocs Classic Clog",
        variant: "White",
        brand: "Crocs",
        price: 55000,
        sizes: [7, 43, 44, 45],
        image: "/images/crocs-classic-white.jpg",
        inStock: true
    },

    {
        name: "Crocs Echo Clog",
        variant: "Grey",
        brand: "Crocs",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/crocs-echo-clog.jpg",
        inStock: true
    },

    {
        name: "Crocs Bayaband Clog",
        variant: "Navy/White",
        brand: "Crocs",
        price: 65000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/crocs-bayaband.jpg",
        inStock: true
    },

    // =========================
    // UNDER ARMOUR
    // =========================

    {
        name: "Under Armour HOVR Phantom",
        variant: "Black/White",
        brand: "Under Armour",
        price: 105000,
        sizes: [43, 44, 45],
        image: "/images/under-armour-hovr-phantom.jpg",
        inStock: true
    },

    {
        name: "Under Armour Charged Assert",
        variant: "Black/Grey",
        brand: "Under Armour",
        price: 75000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/under-armour-charged-assert.jpg",
        inStock: true
    },

    {
        name: "Under Armour Tribase Reign",
        variant: "Black/Red",
        brand: "Under Armour",
        price: 95000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/under-armour-tribase-reign.jpg",
        inStock: true
    },

    // =========================
    // SAUCONY
    // =========================

    {
        name: "Saucony Jazz Original",
        variant: "Grey/Blue",
        brand: "Saucony",
        price: 80000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/saucony-jazz-original.jpg",
        inStock: true
    },

    {
        name: "Saucony Shadow 6000",
        variant: "Grey/White",
        brand: "Saucony",
        price: 95000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/saucony-shadow-6000.jpg",
        inStock: true
    },

    // =========================
    // ASH
    // =========================

    {
        name: "Classic Leather Sneaker",
        variant: "Black",
        brand: "ASH",
        price: 70000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-leather-black.jpg",
        inStock: true
    },

    {
        name: "Classic Leather Sneaker",
        variant: "White",
        brand: "ASH",
        price: 70000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-leather-white.jpg",
        inStock: true
    },

    // =========================
    // CASUAL / EVERYDAY
    // =========================

    {
        name: "Classic Canvas Sneaker",
        variant: "Black",
        brand: "FeetFirst",
        price: 45000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-canvas-black.jpg",
        inStock: true
    },

    {
        name: "Classic Canvas Sneaker",
        variant: "White",
        brand: "FeetFirst",
        price: 45000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-canvas-white.jpg",
        inStock: true
    },

    {
        name: "Casual Low Top Sneaker",
        variant: "Grey",
        brand: "FeetFirst",
        price: 50000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/casual-low-top-grey.jpg",
        inStock: true
    },

    {
        name: "Casual Low Top Sneaker",
        variant: "Navy",
        brand: "FeetFirst",
        price: 50000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/casual-low-top-navy.jpg",
        inStock: true
    },

    {
        name: "Premium Leather Loafers",
        variant: "Brown",
        brand: "FeetFirst",
        price: 65000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/premium-leather-loafers-brown.jpg",
        inStock: true
    },

    {
        name: "Premium Leather Loafers",
        variant: "Black",
        brand: "FeetFirst",
        price: 65000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/premium-leather-loafers-black.jpg",
        inStock: true
    },

    {
        name: "Classic Men's Slides",
        variant: "Black",
        brand: "FeetFirst",
        price: 35000,
        sizes: [7, 43, 44, 45],
        image: "/images/classic-slides-black.jpg",
        inStock: true
    },

    {
        name: "Classic Men's Slides",
        variant: "Brown",
        brand: "FeetFirst",
        price: 35000,
        sizes: [7, 43, 44, 45],
        image: "/images/classic-slides-brown.jpg",
        inStock: true
    },

    {
        name: "Premium Casual Sneakers",
        variant: "Black/White",
        brand: "FeetFirst",
        price: 60000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/premium-casual-sneakers.jpg",
        inStock: true
    },

    {
        name: "Premium Running Sneakers",
        variant: "Black/Grey",
        brand: "FeetFirst",
        price: 70000,
        sizes: [43, 44, 45],
        image: "/images/premium-running-sneakers.jpg",
        inStock: true
    },

    {
        name: "Classic Formal Shoes",
        variant: "Black Leather",
        brand: "FeetFirst",
        price: 60000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-formal-black.jpg",
        inStock: true
    },

    {
        name: "Classic Formal Shoes",
        variant: "Brown Leather",
        brand: "FeetFirst",
        price: 60000,
        sizes: [41, 42, 43, 44, 45],
        image: "/images/classic-formal-brown.jpg",
        inStock: true
    }

];

async function seedProducts() {
    try {

        await connectDB();

        // Remove existing products
        await Product.deleteMany({});

        // Insert fresh products
        await Product.insertMany(products);

        console.log(`✅ ${products.length} products inserted successfully.`);

        process.exit();

    } catch (err) {

        console.error("❌ Error seeding products:", err);

        process.exit(1);

    }
}

seedProducts();