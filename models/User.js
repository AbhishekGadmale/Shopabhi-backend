import mongoose from "mongoose";
const userSchema=new mongoose.Schema({
    name:{type:String , required:true},
    email:{type:String , required:true, unique:true},
    password:{type:String,required:true},
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    cart: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, default: 1 }
        }
    ],
    passwordResetToken: String,
    passwordResetExpires: Date
});

export default mongoose.model("User",userSchema);