import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  attributes: [
    {
      name: { type: String, required: true },
      value: { type: String, required: true },
    }
  ],
  price: {
    type: Number,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
}, { timestamps: true });

variantSchema.index({ product: 1 });
variantSchema.index({ sku: 1 });

export default mongoose.model("Variant", variantSchema);
