import Chat from '../models/chat.model.js';


// Create Chat Controller

async function createChat( req , res ) {

    const {title} = req.body;

    const user = req.user;

    const chat = await Chat.create({
        user:user._id,
        title,
    });


    res.status(201).json({
        message:'Chat created successfully',
        chat:{
            _id:chat._id,
            title:chat.title,
            lastActivity:chat.lastActivity,
        }
    })

    
}

export default {
    createChat 
}