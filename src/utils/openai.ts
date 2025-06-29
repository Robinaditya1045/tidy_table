// import OpenAI from "openai";
// import dotenv from "dotenv";

// // Load environment variables from .env.local
// dotenv.config({ path: '.env.local' });

// const apiKey = process.env.OPENAI_API_KEY;

// if (!apiKey) {
//   console.error("OpenAI API key not found. Please add OPENAI_API_KEY to your .env.local file");
//   // Don't throw error here, we'll check before using the client
// }

// export const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export function validateApiKey() {
//   if (!process.env.OPENAI_API_KEY) {
//     throw new Error("OpenAI API key not found. Please add OPENAI_API_KEY to your .env.local file");
//   }
// }
