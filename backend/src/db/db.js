import mongoose from 'mongoose';
import config  from '../config/config.js';

async function connectDB(){

    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("Mongo DB Connected Successfully ✅");
        
    } catch (error) {
        console.log("Mongo DB Connection Failed ❌");
        process.exit(1);
        
    }
}

export default connectDB;