import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const _config = {

    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',


}

export default Object.freeze(_config);
