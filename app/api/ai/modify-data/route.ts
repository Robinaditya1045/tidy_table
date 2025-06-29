import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { instruction, data } = await req.json()

    const modificationResult = await generateStructuredOutput(
      `You are a data modification AI. The user wants to modify their data using natural language.
        
        User instruction: "${instruction}"
        
        Available data:
        Clients (${data.clients.length} records): ${JSON.stringify(data.clients.slice(0, 2), null, 2)}
        Workers (${data.workers.length} records): ${JSON.stringify(data.workers.slice(0, 2), null, 2)}
        Tasks (${data.tasks.length} records): ${JSON.stringify(data.tasks.slice(0, 2), null, 2)}
        
        Please:
        1. Understand the user's modification intent
        2. Identify which records need to be changed
        3. Determine the specific field changes required
        4. Provide confidence scores for each change (0-1)
        5. Explain the reasoning behind each modification
        
        Important guidelines:
        - Only suggest changes that directly match the user's instruction
        - Be conservative with modifications - accuracy is critical
        - Provide detailed reasoning for each change
        - Use confidence scores to indicate certainty
        - Preserve data integrity and relationships
        
        Example patterns:
        - "Increase priority by 1" → find PriorityLevel fields and increment by 1
        - "Add skill X to workers with skill Y" → find workers with Y, add X to Skills array
        - "Set duration to 3 for category Z" → find tasks with Category=Z, set Duration=3
        
        Return structured modification suggestions with specific changes.`,
      z.object({
        suggestions: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            entityType: z.enum(["clients", "workers", "tasks"]),
            changes: z.array(
              z.object({
                rowIndex: z.number(),
                field: z.string(),
                oldValue: z.any(),
                newValue: z.any(),
                confidence: z.number().min(0).max(1),
              }),
            ),
            reasoning: z.string(),
          }),
        ),
      }),
      { provider: "ollama" }
    )

    return Response.json(modificationResult)
  } catch (error) {
    console.error("AI data modification error:", error)
    return Response.json({ suggestions: [] }, { status: 500 })
  }
}
  