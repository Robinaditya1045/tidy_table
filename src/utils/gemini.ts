import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Google Gemini API key not found. Please add GEMINI_API_KEY to your .env.local file");
  // Don't throw error here, we'll check before using the client
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

// Helper function to create a model instance - similar interface to OpenAI for easier migration
export const gemini = (modelName: string = "gemini-1.5-pro") => ({
  modelName,
  genAI: genAI,
});

export function validateApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Google Gemini API key not found. Please add GEMINI_API_KEY to your .env.local file");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to generate structured output similar to generateObject from the ai package
export const generateStructuredOutput = async <T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> => {
  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
  });
  
  // Implement retry with exponential backoff
  const maxRetries = 5;
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount < maxRetries) {
    try {
      // Use structured output from Gemini
      const result = await geminiModel.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: prompt.toString() }] 
        }],
        generationConfig: {
          temperature: 0.2,
        },
      });
      
      // Get the response text
      const responseText = result.response.text();
      
      // Try to parse as JSON
      try {
        const parsedData = JSON.parse(responseText);
        return schema.parse(parsedData);
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        throw new Error("Failed to parse structured output from AI");
      }
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.message && error.message.includes("429 Too Many Requests")) {
        retryCount++;
        
        // Calculate exponential backoff with jitter
        const baseDelay = 1000; // 1 second
        const maxDelay = 60000; // 60 seconds
        const expBackoff = Math.min(
          maxDelay,
          baseDelay * Math.pow(2, retryCount) * (0.8 + Math.random() * 0.4) // Add jitter
        );
        
        console.log(`Rate limit reached. Retrying in ${Math.round(expBackoff/1000)} seconds... (Attempt ${retryCount}/${maxRetries})`);
        
        // Wait before retrying
        await sleep(expBackoff);
      } else {
        // If it's not a rate limit error, don't retry
        throw error;
      }
    }
  }
  
  // If we've exhausted all retries
  throw lastError || new Error("Failed after maximum retry attempts");
}
