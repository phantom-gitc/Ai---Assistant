import Chat from '../models/chat.model.js';


// Create Chat Controller

async function createChat( req , res ) {
    try {
        const title = req.body?.title?.trim();

        if(!title){
            return res.status(400).json({
                message:'Chat title is required'
            })
        }

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
    } catch (error) {
        res.status(500).json({
            message:'Something went wrong while creating chat'
        })
    }

    
}

export default {
    createChat 
}
