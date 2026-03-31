import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const result = await genAI.listModels();
        console.log("--- Available Models ---");
        result.models.forEach(m => console.log(m.name));
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

listModels();
