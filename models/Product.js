import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Base price
  image: { type: String, required: true }, // Primary image
  images: [{ type: String }], // Gallery
  category: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }, // Total stock or base stock
  attributes: [
    {
      name: String, // e.g., "Color"
      values: [String] // e.g., ["Red", "Blue"]
    }
  ],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Add Indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: "text", description: "text" }); // Text index for optimized search

export default mongoose.model("Product", productSchema);
