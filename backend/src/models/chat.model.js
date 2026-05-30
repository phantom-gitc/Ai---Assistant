import mongoose from 'mongoose';


const chatSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    title:{
        type:String,
        required:true,
        trim:true,
    },
    lastActivity:{
        type:Date,
        default:Date.now,
    }
},{
    timestamps:true,
})

export default mongoose.model('Chat',chatSchema);
