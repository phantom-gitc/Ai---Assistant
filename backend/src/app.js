import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';


// Routes 
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';



const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());



// Using Routes

app.use('/api/auth',authRoutes);
app.use('/api/chat',chatRoutes);




export default app;