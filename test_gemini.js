import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("Using API Key:", apiKey.substring(0, 5) + "..." + apiKey.slice(-4));
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // This is the call that might fail
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent("Test");
        console.log("Success with gemini-1.5-flash!");
        console.log("Response:", result.response.text());
        
    } catch (e) {
        console.error("--- ERROR DETAIL ---");
        console.error("Message:", e.message);
        console.error("Status Code (if any):", e.status);
        if (e.response) {
            console.error("Response JSON:", JSON.stringify(e.response, null, 2));
        }
    }
}

listModels();
