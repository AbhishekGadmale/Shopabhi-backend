import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Category from "./models/Category.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const products = [
  {
    name: "Wireless Headphone",
    price: 1599,
    image: "/images/wirelessheadphone.jpg",
    category: "Electronics",
    description: "High-quality wireless headphones with deep bass and long battery life.",
    rating: 4.5,
    stock: 50
  },
  {
    name: "Smart Watch",
    price: 2499,
    image: "/images/smartWatch.jpg",
    category: "Electronics",
    description: "Feature-packed smartwatch with fitness tracking and notifications.",
    rating: 4.3,
    stock: 30
  },
  {
    name: "Bluetooth Speaker",
    price: 1999,
    image: "/images/speaker.jpg",
    category: "Electronics",
    description: "Portable Bluetooth speaker with powerful sound and clear audio.",
    rating: 4.4,
    stock: 40
  },
  {
    name: "Gaming Mouse",
    price: 999,
    image: "/images/mouse2.jpg",
    category: "Accessories",
    description: "Ergonomic gaming mouse with high precision and RGB lighting.",
    rating: 4.2,
    stock: 60
  },
  {
    name: "Food",
    price: 99,
    image: "/images/food.jpg",
    category: "Food",
    description: "Fresh and tasty food item made with quality ingredients.",
    rating: 4.0,
    stock: 100
  },
  {
    name: "Beauty Products",
    price: 2499,
    image: "/images/beauty.jpg",
    category: "Beauty",
    description: "Premium beauty products for healthy and glowing skin.",
    rating: 4.6,
    stock: 25
  },
  {
    name: "Skin Care",
    price: 1999,
    image: "/images/skincare.jpg",
    category: "Beauty",
    description: "Skin care essentials to nourish and protect your skin.",
    rating: 4.5,
    stock: 35
  },
  {
    name: "Snacks",
    price: 999,
    image: "/images/snacks.jpg",
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
    console.log("Existing products deleted.");
    await Product.insertMany(products);
    console.log("Products seeded successfully.");

    await Category.deleteMany();
    const uniqueCategories = [...new Set(products.map(p => p.category))];
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
