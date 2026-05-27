import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import chatController from '../controllers/chat.controller.js';



const router = express.Router();


// @desc POST /api/chat/
// @access Private

router.post('/',authMiddleware.authUser,chatController.createChat)




export default router;
