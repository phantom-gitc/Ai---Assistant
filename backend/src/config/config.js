import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const _config = {

    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,


}

export default Object.freeze(_config);