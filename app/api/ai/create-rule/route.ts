import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { naturalLanguage, data, existingRules } = await req.json()

    const ruleResult = await generateStructuredOutput(
      `You are a business rules AI. Convert the user's natural language description into a structured business rule.
        
        User request: "${naturalLanguage}"
        
        Available rule types:
        - coRun: Tasks that must run together
        - slotRestriction: Minimum common slots requirement
        - loadLimit: Maximum slots per phase for workers
        - phaseWindow: Allowed phases for specific tasks
        - patternMatch: Regex-based rules
        - precedence: Rule priority ordering
        
        Available data context:
        - Clients: ${data.clients.length} records
        - Workers: ${data.workers.length} records  
        - Tasks: ${data.tasks.length} records
        
        Sample data for reference:
        ${JSON.stringify(
          {
            clients: data.clients.slice(0, 1),
            workers: data.workers.slice(0, 1),
            tasks: data.tasks.slice(0, 1),
          },
          null,
          2,
        )}
        
        Existing rules: ${existingRules.length} rules
        
        Please:
        1. Analyze the natural language request
        2. Determine the appropriate rule type
        3. Extract relevant parameters (task IDs, worker groups, etc.)
        4. Create a structured rule configuration
        5. Generate a clear name and description
        
        If the request cannot be converted to a rule, return an error message.
        
        Example outputs:
        - "Tasks T12 and T14 should run together" → coRun rule with tasks: ["T12", "T14"]
        - "Sales workers max 3 slots per phase" → loadLimit rule with workerGroup: "Sales", maxSlots: 3`,
      z.object({
        rule: z
          .object({
            type: z.string(),
            name: z.string(),
            description: z.string(),
            config: z.any(),
          })
          .optional(),
        error: z.string().optional(),
      }),
      { provider: "ollama" },
    )

    return Response.json(ruleResult)
  } catch (error) {
    console.error("AI rule creation error:", error)
    return Response.json({ error: "Failed to create rule" }, { status: 500 })
  }
}
  