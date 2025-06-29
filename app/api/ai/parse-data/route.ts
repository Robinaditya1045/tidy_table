import { generateStructuredOutput } from "@/src/utils/ai-provider"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const { data, entityType } = await req.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return Response.json({ processedData: data })
    }

    // Define expected schemas for each entity type
    const schemas = {
      clients: z.object({
        ClientID: z.string(),
        Name: z.string(),
        PriorityLevel: z.number().min(1).max(5),
        RequestedTaskIDs: z.array(z.string()),
        AttributesJSON: z.string().optional(),
      }),
      workers: z.object({
        WorkerID: z.string(),
        Name: z.string(),
        Skills: z.array(z.string()),
        AvailableSlots: z.array(z.number()),
        MaxLoadPerPhase: z.number(),
        AttributesJSON: z.string().optional(),
      }),
      tasks: z.object({
        TaskID: z.string(),
        Name: z.string(),
        Duration: z.number().min(1),
        RequiredSkills: z.array(z.string()),
        PreferredPhases: z.array(z.number()),
        MaxConcurrent: z.number().min(1),
        AttributesJSON: z.string().optional(),
      }),
    }

    const schema = schemas[entityType as keyof typeof schemas]
    if (!schema) {
      return Response.json({ processedData: data })
    }

    // Sample the first few rows to understand the structure
    const sampleData = data.slice(0, 3)
    const headers = Object.keys(sampleData[0] || {})

    const mappingResult = await generateStructuredOutput(
      `You are a data processing AI. I have ${entityType} data with these headers: ${headers.join(", ")}
        
        Sample data (first 3 rows):
        ${JSON.stringify(sampleData, null, 2)}
        
        Expected schema for ${entityType}:
        - ClientID: string (unique identifier)
        - Name: string (client name)
        - PriorityLevel: number (1-5, where 5 is highest priority)
        - RequestedTaskIDs: array of strings (task identifiers)
        - AttributesJSON: optional string (JSON data)
        
        Task: Create column mappings and process the sample data.
        
        Column mappings should map original headers to target schema fields.
        Processed rows should transform the sample data to match the expected format.
        Suggestions should be an array of strings with data quality recommendations.
        
        For RequestedTaskIDs field: Convert comma-separated strings like "T1,T2,T3" to ["T1","T2","T3"]
        For PriorityLevel field: Ensure it's a number between 1-5
        For AttributesJSON field: Ensure it's a valid JSON string or empty string`,
      z.object({
        columnMappings: z.record(z.string()).describe("Maps original column names to target schema field names"),
        processedRows: z.array(z.record(z.any())).describe("Sample data transformed to match target schema"),
        suggestions: z.array(z.string()).describe("Array of data quality improvement suggestions"),
      })
    )

    // Apply the mappings to all data
    const processedData = data.map((row) => {
      const processedRow: any = {}

      // Apply column mappings
      Object.entries(mappingResult.columnMappings).forEach(([originalCol, targetCol]) => {
        if (row[originalCol] !== undefined) {
          let value = row[originalCol]

          // Process specific field types
          if (
            targetCol.includes("Skills") ||
            targetCol.includes("TaskIDs") ||
            targetCol.includes("Phases") ||
            targetCol.includes("Slots")
          ) {
            // Convert comma-separated strings to arrays
            if (typeof value === "string") {
              value = value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v)
              // Convert to numbers if it's slots or phases
              if (targetCol.includes("Slots") || targetCol.includes("Phases")) {
                value = value.map((v) => Number.parseInt(v)).filter((v) => !isNaN(v))
              }
            }
          } else if (
            targetCol.includes("Level") ||
            targetCol.includes("Duration") ||
            targetCol.includes("Load") ||
            targetCol.includes("Concurrent")
          ) {
            // Convert to numbers
            value = Number.parseInt(value) || 0
          } else if (targetCol.includes("JSON")) {
            // Try to parse JSON
            if (typeof value === "string") {
              try {
                JSON.parse(value)
              } catch {
                value = "{}"
              }
            }
          }

          processedRow[targetCol] = value
        }
      })

      return processedRow
    })

    return Response.json({
      processedData,
      suggestions: mappingResult.suggestions,
    })
  } catch (error) {
    console.error("AI parsing error:", error)
    return Response.json({ processedData: [] }, { status: 500 })
  }
}

