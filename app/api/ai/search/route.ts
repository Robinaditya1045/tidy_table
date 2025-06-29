import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { query, data } = await req.json()

    const searchResult = await generateStructuredOutput(
      `You are a data search AI. The user wants to search through their data using natural language.
        
        User query: "${query}"
        
        Available data:
        Clients (${data.clients.length} records): ${JSON.stringify(data.clients.slice(0, 2), null, 2)}
        Workers (${data.workers.length} records): ${JSON.stringify(data.workers.slice(0, 2), null, 2)}
        Tasks (${data.tasks.length} records): ${JSON.stringify(data.tasks.slice(0, 2), null, 2)}
        
        Please:
        1. Understand the user's search intent
        2. Filter the data based on the criteria mentioned
        3. Return matching records from each entity type
        4. Provide a clear explanation of what you found and why
        
        For example:
        - "tasks with duration more than 2" should filter tasks where Duration > 2
        - "workers available in phase 1" should filter workers where AvailableSlots includes 1
        - "high priority clients" should filter clients where PriorityLevel >= 4
        
        Return the filtered results and explanation.`,
      z.object({
        clients: z.array(z.any()),
        workers: z.array(z.any()),
        tasks: z.array(z.any()),
        explanation: z.string(),
      }),
      { provider: "ollama" },
    )

    return Response.json(searchResult)
  } catch (error) {
    console.error("AI search error:", error)
    return Response.json(
      {
        clients: [],
        workers: [],
        tasks: [],
        explanation: "Search failed. Please try again.",
      },
      { status: 500 },
    )
  }
}
