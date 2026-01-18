import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name: {type:String, required:true},
    price:{type:Number, required:true},
    quantity:{type:Number,required:true}
});

const orderSchema= new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"user",required:true},
    items:{type:[itemSchema],required:true},
    total:{type:Number,required:true},
    details:{
        name:{type:String,required:true},
        address:{type:String,required:true},
    },
},
{timestamps:true}
);

export default mongoose.model("order",orderSchema);