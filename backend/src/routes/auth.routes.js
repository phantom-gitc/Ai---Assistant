import express from 'express';
import authController from '../controllers/auth.controller.js';


const router  = express.Router();


// @desc Register a new user
// @route POST /api/auth/register
// @access Public

router.post('/register',authController.registerUser);


// @desc Login a user
// @route POST /api/auth/login
// @access Public

router.post('/login',authController.loginUser);






export default router;