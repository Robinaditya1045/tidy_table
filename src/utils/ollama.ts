import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "llama3.1:8b";

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model?: string) {
    this.baseUrl = baseUrl;
    // Use the defined DEFAULT_MODEL instead of hardcoded 'llama2'
    this.model = model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    
    if (!this.model || this.model.trim() === '') {
      throw new Error('Ollama model name cannot be empty. Please set OLLAMA_MODEL environment variable or provide a model name.');
    }
    
    console.log(`Initialized Ollama client with model: ${this.model}`);
  }

  async generateText(prompt: string): Promise<string> {
    try {
      console.log(`Using Ollama model: ${this.model}`);
      
      // Validate model exists before making request
      const availableModels = await this.listModels();
      if (availableModels.length > 0 && !availableModels.includes(this.model)) {
        console.warn(`Model '${this.model}' not found in available models: ${availableModels.join(', ')}`);
        console.warn(`To pull the model, run: docker exec -it ai-data-manager-ollama ollama pull ${this.model}`);
      }
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API error details:', errorText);
        
        // Provide specific guidance for model not found error
        if (errorText.includes('model') && errorText.includes('not found')) {
          throw new Error(`Model '${this.model}' not found. Please run: ollama pull ${this.model}`);
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Failed to connect to Ollama. Please ensure Ollama is running on http://localhost:11434');
      }
      
      throw error;
    }
  }

  async generateStructuredOutput<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    // Create a more detailed prompt with schema example
    const schemaExample = this.getSchemaExample(schema);
    const structuredPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON that matches this exact structure:
${JSON.stringify(schemaExample, null, 2)}

Rules:
- Return ONLY the JSON object, no explanations or additional text
- Ensure all required fields are present
- Use proper data types (strings, numbers, arrays, objects)
- Do not include markdown formatting or code blocks
- The response must be parseable as JSON

Example response format:
${JSON.stringify(schemaExample, null, 2)}`;
    
    const maxAttempts = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.generateText(structuredPrompt);
        
        // Clean the response more thoroughly
        let jsonStr = response.trim();
        
        // Remove any text before the first {
        const firstBrace = jsonStr.indexOf('{');
        if (firstBrace > 0) {
          jsonStr = jsonStr.substring(firstBrace);
        }
        
        // Remove any text after the last }
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace !== -1) {
          jsonStr = jsonStr.substring(0, lastBrace + 1);
        }
        
        // Remove markdown code blocks if present
        jsonStr = jsonStr
          .replace(/^```json\s*/gm, '')
          .replace(/^```\s*/gm, '')
          .replace(/\s*```$/gm, '');
        
        console.log(`Attempt ${attempt}: Cleaned JSON string:`, jsonStr.substring(0, 200) + '...');
        
        const parsed = JSON.parse(jsonStr);
        
        // Validate with schema
        const result = schema.parse(parsed);
        console.log(`Successfully parsed structured output on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Structured output attempt ${attempt} failed:`, error);
        
        if (attempt < maxAttempts) {
          console.log(`Retrying structured output... (${attempt}/${maxAttempts})`);
          // Add a small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error('All structured output attempts failed. Last error:', lastError);
    throw lastError || new Error('Failed to generate valid structured output');
  }

  private getSchemaExample(schema: z.ZodType): any {
    // Generate more detailed example structure based on Zod schema
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const example: any = {};
      
      for (const [key, value] of Object.entries(shape)) {
        if (value instanceof z.ZodString) {
          example[key] = "example_string";
        } else if (value instanceof z.ZodNumber) {
          example[key] = 123;
        } else if (value instanceof z.ZodBoolean) {
          example[key] = true;
        } else if (value instanceof z.ZodArray) {
          // Check what type of array it is
          const innerType = (value as any)._def?.type;
          if (innerType instanceof z.ZodString) {
            example[key] = ["string1", "string2"];
          } else if (innerType instanceof z.ZodNumber) {
            example[key] = [1, 2, 3];
          } else {
            example[key] = ["item1", "item2"];
          }
        } else if (value instanceof z.ZodRecord) {
          example[key] = { "key1": "value1", "key2": "value2" };
        } else if (value instanceof z.ZodOptional) {
          // Handle optional fields
          const innerType = (value as any)._def?.innerType;
          if (innerType instanceof z.ZodString) {
            example[key] = "optional_string";
          } else if (innerType instanceof z.ZodArray) {
            example[key] = ["optional_item"];
          } else {
            example[key] = "optional_value";
          }
        } else {
          example[key] = "any_value";
        }
      }
      
      return example;
    }
    
    return {};
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ollama = new OllamaClient();

export function validateOllamaConnection() {
  return ollama.isHealthy();
}
