import User from '../models/user.model.js';
import config from "../config/config.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;

function getCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000,
    };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// @desc Register a new user
// @route POST /api/auth/register
// @access Public


async function registerUser(req , res){
    try {
        const { fullName = {}, email, password } = req.body || {};
        const firstName = fullName.firstName?.trim();
        const lastName = fullName.lastName?.trim();
        const normalizedEmail = email?.trim().toLowerCase();

        if(!firstName || !lastName || !normalizedEmail || !password){
            return res.status(400).json({
                message:'First name, last name, email and password are required'
            });
        }

        if(!isValidEmail(normalizedEmail)){
            return res.status(400).json({
                message:'Please provide a valid email'
            });
        }

        if(password.length < 6){
            return res.status(400).json({
                message:'Password must be at least 6 characters long'
            });
        }

        const isUserAlreadyExist = await User.findOne({email: normalizedEmail});

        if(isUserAlreadyExist){
            return res.status(400).json({
                message:'User already exist'
            });
        }

        // Hash password using bcrypt and store it in the database  
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);


        const user = await User.create({
            fullName:{
                firstName , lastName
            },
            email: normalizedEmail,
            password:hashedPassword

        })
        // Generate JWT token

        const token = jwt.sign({id:user._id},config.JWT_SECRET,{expiresIn:'1h'});

        // Return user information
        res.cookie('token',token,getCookieOptions());

        res.json({
            message:'User registered successfully ',
            user:{
                _id:user._id,
                fullName:{
                    firstName ,
                    lastName
                },
                email: user.email,
            }
        })
    } catch (error) {
        res.status(500).json({
            message:'Something went wrong while registering user'
        })
    }
}



// @desc Login a user
// @route POST /api/auth/login
// @access Public

async function loginUser(req , res){
    try {
        const {email , password} = req.body || {};
        const normalizedEmail = email?.trim().toLowerCase();

        if(!normalizedEmail || !password){
            return res.status(400).json({
                message:"Email and password are required"
            })
        }
     
        const user = await User.findOne({email: normalizedEmail});

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
        res.cookie('token',token,getCookieOptions());

        res.status(200).json({
            message:"user login successfully",
            user:{
                _id:user._id,
                email:user.email,
            }
        })
    } catch (error) {
        res.status(500).json({
            message:'Something went wrong while logging in'
        })
    }
}


export default {
    registerUser,
    loginUser
}
