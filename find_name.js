import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // This is the call that lists available models for this key
        const models = await genAI.getGenerativeModel({ model: "gemini-pro" }).listModels();
        // Wait, listModels is on the genAI instance or another service.
        // In @google/generative-ai, listModels is not on genAI instance directly easily?
        // Actually, you usually use a management client or just try names.
        
        console.log("Testing names...");
        const names = ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash-latest"];
        for (const name of names) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                await model.generateContent("hi");
                console.log(`✅ Success with: ${name}`);
            } catch (e) {
                console.log(`❌ Failed with: ${name} (${e.status || e.message})`);
            }
        }
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

listModels();
