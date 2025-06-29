import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { data, errors } = await req.json()

    const correctionResult = await generateStructuredOutput(
      `You are an AI data correction specialist. Analyze validation errors and suggest specific fixes.
        
        Data context:
        Clients: ${data.clients.length} records
        Workers: ${data.workers.length} records  
        Tasks: ${data.tasks.length} records
        
        Sample data:
        ${JSON.stringify(
          {
            clients: data.clients.slice(0, 2),
            workers: data.workers.slice(0, 2),
            tasks: data.tasks.slice(0, 2),
          },
          null,
          2,
        )}
        
        Validation errors to fix:
        ${JSON.stringify(errors, null, 2)}
        
        For each error, provide:
        1. Specific correction suggestion with exact new value
        2. Confidence score (0-1) based on certainty of fix
        3. Clear reasoning for the suggested change
        4. Whether the fix can be auto-applied safely
        
        Correction guidelines:
        - For missing values: suggest reasonable defaults based on context
        - For invalid ranges: adjust to nearest valid value
        - For malformed arrays: parse and restructure correctly
        - For duplicate IDs: suggest unique alternatives
        - For broken JSON: fix syntax or provide valid structure
        - For unknown references: suggest removal or valid alternatives
        
        Auto-applicable criteria:
        - High confidence (>0.8)
        - No risk of data loss
        - Clear, unambiguous fix
        - Doesn't affect business logic
        
        Return specific, actionable correction suggestions.`,
      z.object({
        corrections: z.array(
          z.object({
            id: z.string(),
            errorId: z.string(),
            description: z.string(),
            entityType: z.enum(["clients", "workers", "tasks"]),
            rowIndex: z.number(),
            field: z.string(),
            currentValue: z.any(),
            suggestedValue: z.any(),
            confidence: z.number().min(0).max(1),
            reasoning: z.string(),
            autoApplicable: z.boolean(),
          }),
        ),
      }),
      { provider: "ollama" }
    )

    return Response.json(correctionResult)
  } catch (error) {
    console.error("AI correction generation error:", error)
    return Response.json({ corrections: [] }, { status: 500 })
  }
}
