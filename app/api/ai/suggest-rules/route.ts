import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { data, existingRules } = await req.json()

    const suggestionsResult = await generateStructuredOutput(
      `You are a business rules AI. Analyze the provided data and suggest useful business rules.
        
        Data summary:
        - Clients: ${data.clients.length} records
        - Workers: ${data.workers.length} records
        - Tasks: ${data.tasks.length} records
        
        Sample data:
        ${JSON.stringify(
          {
            clients: data.clients.slice(0, 3),
            workers: data.workers.slice(0, 3),
            tasks: data.tasks.slice(0, 3),
          },
          null,
          2,
        )}
        
        Existing rules: ${existingRules.length}
        ${existingRules.map((r) => `- ${r.name} (${r.type})`).join("\n")}
        
        Please analyze the data for patterns and suggest 3-5 useful business rules such as:
        
        1. Co-run opportunities (tasks that often appear together)
        2. Load balancing (workers with too many/few slots)
        3. Skill coverage gaps (required skills not covered by available workers)
        4. Phase optimization (tasks that could be grouped by preferred phases)
        5. Priority conflicts (high-priority clients with conflicting requirements)
        
        For each suggestion:
        - Provide a unique ID
        - Choose appropriate rule type
        - Give clear name and description
        - Include reasoning for why this rule would be helpful
        - Provide specific configuration based on actual data
        
        Focus on actionable, data-driven suggestions that would improve efficiency or prevent conflicts.`,
      z.object({
        suggestions: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            description: z.string(),
            config: z.any(),
            reasoning: z.string(),
          }),
        ),
      }),
      { provider: "ollama" }
    )

    return Response.json(suggestionsResult)
  } catch (error) {
    console.error("AI suggestions error:", error)
    return Response.json({ suggestions: [] }, { status: 500 })
  }
}
