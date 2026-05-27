import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';


async function authUser(req , res , next) {
    
    const {token} = req.cookies;

    if(!token){
       return res.status(401).json({
            message:'Unauthorized',
        })
    }

    try {
        const decoded = jwt.verify(token,config.JWT_SECRET);

        const user = await User.findById(decoded.id);

        req.user = user;
        next();


    } catch (error) {
          res.status(401).json({
            message:'Unauthorized',
        })
    }
    
}


export default{
    authUser
};