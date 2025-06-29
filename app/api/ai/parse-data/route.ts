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
        ClientName: z.string(),
        PriorityLevel: z.number().min(1).max(5),
        RequestedTaskIDs: z.array(z.string()),
        GroupTag: z.string(),
        AttributesJSON: z.string().optional(),
      }),
      workers: z.object({
        WorkerID: z.string(),
        WorkerName: z.string(),
        Skills: z.array(z.string()),
        AvailableSlots: z.array(z.number()),
        MaxLoadPerPhase: z.number(),
        WorkerGroup: z.string(),
        QualificationLevel: z.number(),
        AttributesJSON: z.string().optional(),
      }),
      tasks: z.object({
        TaskID: z.string(),
        TaskName: z.string(),
        Category: z.string(),
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
        ${JSON.stringify(schema.parse({
          // Provide example based on entity type
          ...(entityType === 'clients' && {
            ClientID: "C001",
            ClientName: "Example Client",
            PriorityLevel: 3,
            RequestedTaskIDs: ["T1", "T2"],
            GroupTag: "GroupA",
            AttributesJSON: "{}"
          }),
          ...(entityType === 'workers' && {
            WorkerID: "W001",
            WorkerName: "Example Worker",
            Skills: ["coding", "analysis"],
            AvailableSlots: [1, 2, 3],
            MaxLoadPerPhase: 2,
            WorkerGroup: "GroupA",
            QualificationLevel: 4,
            AttributesJSON: "{}"
          }),
          ...(entityType === 'tasks' && {
            TaskID: "T001",
            TaskName: "Example Task",
            Category: "Development",
            Duration: 2,
            RequiredSkills: ["coding"],
            PreferredPhases: [1, 2],
            MaxConcurrent: 1,
            AttributesJSON: "{}"
          })
        }), null, 2)}
        
        Task: Create column mappings and process the sample data.
        
        IMPORTANT: Handle these specific formats:
        - For array fields (Skills, AvailableSlots, RequiredSkills, PreferredPhases, RequestedTaskIDs):
          * Convert comma-separated strings like "data,analysis" to ["data", "analysis"]
          * Convert bracket notation like "[1,2,3]" to [1, 2, 3]
          * Convert range notation like "1 - 3" to [1, 2, 3]
          * Convert range notation like "2  -  5" to [2, 3, 4, 5]
        - For number fields: Convert strings to numbers
        - For AttributesJSON: Ensure valid JSON or empty object "{}"
        
        Column mappings should map original headers to target schema fields.
        Processed rows should transform the sample data to match the expected format.`,
      z.object({
        columnMappings: z.record(z.string()).describe("Maps original column names to target schema field names"),
        processedRows: z.array(z.record(z.any())).describe("Sample data transformed to match target schema"),
        suggestions: z.array(z.string()).describe("Array of data quality improvement suggestions"),
      })
    )

    // Apply the mappings to all data with improved parsing
    const processedData = data.map((row) => {
      const processedRow: any = {}

      // Apply column mappings
      Object.entries(mappingResult.columnMappings).forEach(([originalCol, targetCol]) => {
        if (row[originalCol] !== undefined) {
          let value = row[originalCol]

          // Process specific field types with better parsing
          if (
            targetCol.includes("Skills") ||
            targetCol.includes("TaskIDs") ||
            targetCol.includes("Phases") ||
            targetCol.includes("Slots")
          ) {
            // Convert various array formats
            if (typeof value === "string") {
              // Handle bracket notation like "[1,2,3]"
              if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
                try {
                  value = JSON.parse(value.trim())
                } catch {
                  // Fallback to manual parsing
                  value = value.trim().slice(1, -1).split(',').map(v => v.trim()).filter(v => v)
                }
              }
              // Handle range notation like "1 - 3" or "2  -  5"
              else if (value.includes(' - ')) {
                const [start, end] = value.split(' - ').map(v => parseInt(v.trim()))
                if (!isNaN(start) && !isNaN(end)) {
                  value = Array.from({ length: end - start + 1 }, (_, i) => start + i)
                } else {
                  value = []
                }
              }
              // Handle comma-separated strings
              else {
                value = value
                  .split(",")
                  .map((v) => v.trim())
                  .filter((v) => v)
              }
              
              // Convert to numbers if it's slots or phases
              if (targetCol.includes("Slots") || targetCol.includes("Phases")) {
                value = value.map((v: any) => {
                  const num = Number(v)
                  return isNaN(num) ? v : num
                }).filter((v: any) => typeof v === 'number')
              }
            }
          } else if (
            targetCol.includes("Level") ||
            targetCol.includes("Duration") ||
            targetCol.includes("Load") ||
            targetCol.includes("Concurrent")
          ) {
            // Convert to numbers
            value = Number(value) || 0
          } else if (targetCol.includes("JSON")) {
            // Try to parse JSON
            if (typeof value === "string") {
              try {
                JSON.parse(value)
              } catch {
                value = "{}"
              }
            } else {
              value = "{}"
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

