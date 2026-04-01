import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite"
];

for (const modelName of modelsToTest) {
    try {
        process.stdout.write(`Testing ${modelName}... `);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("say hi");
        process.stdout.write(`OK: ${result.response.text().trim().substring(0,30)}\n`);
    } catch(e) {
        process.stdout.write(`FAIL: ${e.message.substring(0, 60)}\n`);
    }
}
process.stdout.write("DONE\n");
