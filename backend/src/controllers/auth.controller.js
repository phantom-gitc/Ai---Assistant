import User from '../models/user.model.js';
import config from "../config/config.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



// @desc Register a new user
// @route POST /api/auth/register
// @access Public


async function registerUser(req , res){

    const {fullName :{firstName,lastName} ,email,password} = req.body;


    const isUserAlreadyExist = await User.findOne({email});

    if(isUserAlreadyExist){
        return res.status(400).json({
            message:'User already exist buddy'
        });
    }

        // Hash password using bcrypt and store it in the database  
        
    const SALT_ROUNDS = 12;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);


    const user = await User.create({
        fullName:{
            firstName , lastName
        },
        email,
        password:hashedPassword

    })
    // Generate JWT token

    const token = jwt.sign({id:user._id},config.JWT_SECRET,{expiresIn:'1h'});

    // Return user information
    res.cookie('token',token);

    res.json({
        message:'User registered successfully ',
        user:{
            _id:user._id,
            fullName:{
                firstName ,
                lastName
            },
            email,
        }
    })
}



// @desc Login a user
// @route POST /api/auth/login
// @access Public

async function loginUser(req , res){
    const {email , password} = req.body;
     
    const user = await User.findOne({email});

    if(!user){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }
    // Compare password with hashed password in the database

    const isPasswordValid = await bcrypt.compare(password,user.password);

    if(!isPasswordValid){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }

    // Generate JWT token 
    const token = jwt.sign({id:user._id},config.JWT_SECRET,{expiresIn:'1h'});

    //Return user information
    res.cookie('token',token);

    res.status(200).json({
        message:"user login successfully",
        user:{
            _id:user._id,
            email,
        }
    })
}


export default {
    registerUser,
    loginUser
}
