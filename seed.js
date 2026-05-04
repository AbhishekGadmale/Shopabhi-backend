import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Category from "./models/Category.js";
import Variant from "./models/Variant.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const productsData = [
  {
    name: "Wireless Headphone",
    price: 1599,
    image: "/images/wirelessheadphone.jpg",
    images: ["/images/wirelessheadphone.jpg", "/images/speaker.jpg"],
    category: "Electronics",
    description: "High-quality wireless headphones with deep bass and long battery life.",
    rating: 4.5,
    stock: 50,
    attributes: [
      { name: "Color", values: ["Black", "Blue", "White"] },
      { name: "Size", values: ["Regular", "Large"] }
    ]
  },
  {
    name: "Smart Watch",
    price: 2499,
    image: "/images/smartWatch.jpg",
    images: ["/images/smartWatch.jpg"],
    category: "Electronics",
    description: "Feature-packed smartwatch with fitness tracking and notifications.",
    rating: 4.3,
    stock: 30,
    attributes: [
      { name: "Color", values: ["Midnight", "Starlight"] }
    ]
  },
  {
    name: "Bluetooth Speaker",
    price: 1999,
    image: "/images/speaker.jpg",
    images: ["/images/speaker.jpg"],
    category: "Electronics",
    description: "Portable Bluetooth speaker with powerful sound and clear audio.",
    rating: 4.4,
    stock: 40
  },
  {
    name: "Gaming Mouse",
    price: 999,
    image: "/images/mouse2.jpg",
    images: ["/images/mouse2.jpg", "/images/mouse1.jpg", "/images/mouse.jpg"],
    category: "Accessories",
    description: "Ergonomic gaming mouse with high precision and RGB lighting.",
    rating: 4.2,
    stock: 60,
    attributes: [
      { name: "Type", values: ["Wired", "Wireless"] }
    ]
  },
  {
    name: "Food",
    price: 99,
    image: "/images/food.jpg",
    images: ["/images/food.jpg"],
    category: "Food",
    description: "Fresh and tasty food item made with quality ingredients.",
    rating: 4.0,
    stock: 100
  },
  {
    name: "Beauty Products",
    price: 2499,
    image: "/images/beauty.jpg",
    images: ["/images/beauty.jpg"],
    category: "Beauty",
    description: "Premium beauty products for healthy and glowing skin.",
    rating: 4.6,
    stock: 25
  },
  {
    name: "Skin Care",
    price: 1999,
    image: "/images/skincare.jpg",
    images: ["/images/skincare.jpg"],
    category: "Beauty",
    description: "Skin care essentials to nourish and protect your skin.",
    rating: 4.5,
    stock: 35
  },
  {
    name: "Snacks",
    price: 999,
    image: "/images/snacks.jpg",
    images: ["/images/snacks.jpg"],
    category: "Food",
    description: "Crunchy and delicious snacks perfect for any time.",
    rating: 4.1,
    stock: 80
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");
    
    await Product.deleteMany();
    await Variant.deleteMany();
    await Category.deleteMany();
    console.log("Existing data deleted.");

    const createdProducts = await Product.insertMany(productsData);
    console.log("Products seeded successfully.");

    // Seed Variants for some products
    const variants = [];
    createdProducts.forEach(product => {
      if (product.attributes && product.attributes.length > 0) {
        // Simple variant generation: just use the first value of each attribute for one variant
        // and another for a second variant if available
        const colorAttr = product.attributes.find(a => a.name === "Color");
        const sizeAttr = product.attributes.find(a => a.name === "Size");

        if (colorAttr) {
          colorAttr.values.forEach((val, index) => {
            variants.push({
              product: product._id,
              sku: `${product.name.substring(0, 3).toUpperCase()}-${val.toUpperCase()}-${index}`,
              attributes: [{ name: "Color", value: val }],
              price: product.price + (index * 100),
              stock: 10 + (index * 5)
            });
          });
        } else if (product.attributes[0]) {
           const attr = product.attributes[0];
           attr.values.forEach((val, index) => {
            variants.push({
              product: product._id,
              sku: `${product.name.substring(0, 3).toUpperCase()}-${val.toUpperCase()}-${index}`,
              attributes: [{ name: attr.name, value: val }],
              price: product.price,
              stock: 20
            });
          });
        }
      }
    });

    if (variants.length > 0) {
      await Variant.insertMany(variants);
      console.log(`${variants.length} Variants seeded successfully.`);
    }

    const uniqueCategories = [...new Set(productsData.map(p => p.category))];
    const categoryDocs = uniqueCategories.map(name => ({ name }));
    await Category.insertMany(categoryDocs);
    console.log("Categories seeded successfully.");
    
    process.exit();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
