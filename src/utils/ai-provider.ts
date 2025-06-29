import { z } from "zod";
import { generateStructuredOutput as geminiGenerate } from "./gemini";
import { ollama } from "./ollama";
import { openai } from "./openai";

export type AIProvider = "gemini" | "ollama" | "openai";

export const AI_PROVIDER = (process.env.AI_PROVIDER as AIProvider) || "ollama";

export interface AIProviderConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
}

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
  config: AIProviderConfig = { provider: AI_PROVIDER }
): Promise<T> {
  const { provider, model, temperature = 0.2 } = config;

  switch (provider) {
    case "ollama":
      return await ollama.generateStructuredOutput(prompt, schema);
    
    case "gemini":
      return await geminiGenerate(prompt, schema);
    
    case "openai":
      // Implement OpenAI structured output if needed
      const completion = await openai.chat.completions.create({
        model: model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature,
      });
      
      const response = completion.choices[0]?.message?.content || "";
      const parsedData = JSON.parse(response);
      return schema.parse(parsedData);
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export async function checkProviderHealth(): Promise<Record<AIProvider, boolean>> {
  const results: Record<AIProvider, boolean> = {
    ollama: false,
    gemini: false,
    openai: false,
  };

  // Check Ollama
  try {
    results.ollama = await ollama.isHealthy();
  } catch {}

  // Check Gemini (basic API key check)
  results.gemini = !!process.env.GEMINI_API_KEY;

  // Check OpenAI (basic API key check)  
  results.openai = !!process.env.OPENAI_API_KEY;

  return results;
}
