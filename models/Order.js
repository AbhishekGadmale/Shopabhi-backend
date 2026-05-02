import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    productId: {type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true},
    name: {type:String, required:true},
    price:{type:Number, required:true},
    quantity:{type:Number,required:true}
});

const orderSchema= new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    items:{type:[itemSchema],required:true},
    total:{type:Number,required:true},
    details:{
        name:{type:String,required:true},
        address:{type:String,required:true},
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },
    status: {
        type: String,
        enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Processing"
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    idempotencyKey: { type: String },
    expiresAt: { type: Date },
    },
    {timestamps:true}
    );

    // Add Indexes for performance
    orderSchema.index({ userId: 1 });
    orderSchema.index({ createdAt: -1 });
    orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Optional TTL, but we handle via cron for stock rollback
    orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

    export default mongoose.model("order",orderSchema);