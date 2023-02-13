import { config } from 'dotenv';
config();

config.MONGO = process.env.MONGO;

export default config;
