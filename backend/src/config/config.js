import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const _config = {

    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',


}

export default Object.freeze(_config);
