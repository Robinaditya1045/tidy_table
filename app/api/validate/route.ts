import type { ValidationError } from "@/app/page"

export async function POST(req: Request) {
  try {
    const { clients, workers, tasks } = await req.json()
    const errors: ValidationError[] = []

    // Core Validation Rules

    // 1. Missing required columns
    validateRequiredColumns(clients, "clients", ["ClientID", "Name", "PriorityLevel"], errors)
    validateRequiredColumns(workers, "workers", ["WorkerID", "Name", "Skills", "AvailableSlots"], errors)
    validateRequiredColumns(tasks, "tasks", ["TaskID", "Name", "Duration", "RequiredSkills"], errors)

    // 2. Duplicate IDs
    validateUniqueIds(clients, "clients", "ClientID", errors)
    validateUniqueIds(workers, "workers", "WorkerID", errors)
    validateUniqueIds(tasks, "tasks", "TaskID", errors)

    // 3. Malformed lists
    validateArrayFields(workers, "workers", "AvailableSlots", "number", errors)
    validateArrayFields(workers, "workers", "Skills", "string", errors)
    validateArrayFields(tasks, "tasks", "RequiredSkills", "string", errors)
    validateArrayFields(tasks, "tasks", "PreferredPhases", "number", errors)

    // 4. Out-of-range values
    validateRange(clients, "clients", "PriorityLevel", 1, 5, errors)
    validateMinValue(tasks, "tasks", "Duration", 1, errors)
    validateMinValue(tasks, "tasks", "MaxConcurrent", 1, errors)
    validateMinValue(workers, "workers", "MaxLoadPerPhase", 1, errors)

    // 5. Broken JSON in AttributesJSON
    validateJSON(clients, "clients", "AttributesJSON", errors)
    validateJSON(workers, "workers", "AttributesJSON", errors)
    validateJSON(tasks, "tasks", "AttributesJSON", errors)

    // 6. Unknown references
    validateTaskReferences(clients, tasks, errors)

    // 7. Overloaded workers
    validateWorkerCapacity(workers, errors)

    // 8. Skill coverage
    validateSkillCoverage(workers, tasks, errors)

    return Response.json({ errors })
  } catch (error) {
    console.error("Validation error:", error)
    return Response.json({ errors: [] }, { status: 500 })
  }
}

function validateRequiredColumns(
  data: any[],
  entityType: string,
  requiredColumns: string[],
  errors: ValidationError[],
) {
  if (!data || data.length === 0) return

  const availableColumns = Object.keys(data[0] || {})
  const missingColumns = requiredColumns.filter((col) => !availableColumns.includes(col))

  if (missingColumns.length > 0) {
    errors.push({
      id: `missing-columns-${entityType}`,
      type: "missingColumns",
      message: `Missing required columns: ${missingColumns.join(", ")}`,
      severity: "error",
      entityType: entityType as any,
      rowIndex: 0,
      columnName: missingColumns[0],
      suggestions: [`Add columns: ${missingColumns.join(", ")}`],
    })
  }
}

function validateUniqueIds(data: any[], entityType: string, idColumn: string, errors: ValidationError[]) {
  if (!data || data.length === 0) return

  const ids = new Set()
  const duplicates = new Set()

  data.forEach((row, index) => {
    const id = row[idColumn]
    if (id) {
      if (ids.has(id)) {
        duplicates.add(id)
        errors.push({
          id: `duplicate-id-${entityType}-${index}`,
          type: "duplicateId",
          message: `Duplicate ${idColumn}: ${id}`,
          severity: "error",
          entityType: entityType as any,
          rowIndex: index,
          columnName: idColumn,
          suggestions: [`Change ${idColumn} to a unique value`],
        })
      } else {
        ids.add(id)
      }
    }
  })
}

function validateArrayFields(
  data: any[],
  entityType: string,
  fieldName: string,
  expectedType: string,
  errors: ValidationError[],
) {
  if (!data || data.length === 0) return

  data.forEach((row, index) => {
    const value = row[fieldName]
    if (value !== undefined && value !== null) {
      if (!Array.isArray(value)) {
        errors.push({
          id: `malformed-array-${entityType}-${index}-${fieldName}`,
          type: "malformedArray",
          message: `${fieldName} should be an array`,
          severity: "error",
          entityType: entityType as any,
          rowIndex: index,
          columnName: fieldName,
          suggestions: [`Convert ${fieldName} to array format`],
        })
      } else {
        // Validate array elements
        const invalidElements = value.filter((item) => {
          if (expectedType === "number") {
            return typeof item !== "number" || isNaN(item)
          }
          return typeof item !== expectedType
        })

        if (invalidElements.length > 0) {
          errors.push({
            id: `invalid-array-elements-${entityType}-${index}-${fieldName}`,
            type: "invalidArrayElements",
            message: `${fieldName} contains invalid ${expectedType} values: ${invalidElements.join(", ")}`,
            severity: "error",
            entityType: entityType as any,
            rowIndex: index,
            columnName: fieldName,
            suggestions: [`Ensure all ${fieldName} values are valid ${expectedType}s`],
          })
        }
      }
    }
  })
}

function validateRange(
  data: any[],
  entityType: string,
  fieldName: string,
  min: number,
  max: number,
  errors: ValidationError[],
) {
  if (!data || data.length === 0) return

  data.forEach((row, index) => {
    const value = row[fieldName]
    if (value !== undefined && value !== null) {
      const numValue = Number(value)
      if (isNaN(numValue) || numValue < min || numValue > max) {
        errors.push({
          id: `out-of-range-${entityType}-${index}-${fieldName}`,
          type: "outOfRange",
          message: `${fieldName} must be between ${min} and ${max}, got: ${value}`,
          severity: "error",
          entityType: entityType as any,
          rowIndex: index,
          columnName: fieldName,
          suggestions: [`Set ${fieldName} to a value between ${min} and ${max}`],
        })
      }
    }
  })
}

function validateMinValue(data: any[], entityType: string, fieldName: string, min: number, errors: ValidationError[]) {
  if (!data || data.length === 0) return

  data.forEach((row, index) => {
    const value = row[fieldName]
    if (value !== undefined && value !== null) {
      const numValue = Number(value)
      if (isNaN(numValue) || numValue < min) {
        errors.push({
          id: `below-minimum-${entityType}-${index}-${fieldName}`,
          type: "belowMinimum",
          message: `${fieldName} must be at least ${min}, got: ${value}`,
          severity: "error",
          entityType: entityType as any,
          rowIndex: index,
          columnName: fieldName,
          suggestions: [`Set ${fieldName} to ${min} or higher`],
        })
      }
    }
  })
}

function validateJSON(data: any[], entityType: string, fieldName: string, errors: ValidationError[]) {
  if (!data || data.length === 0) return

  data.forEach((row, index) => {
    const value = row[fieldName]
    if (value && typeof value === "string") {
      try {
        JSON.parse(value)
      } catch {
        errors.push({
          id: `invalid-json-${entityType}-${index}-${fieldName}`,
          type: "invalidJSON",
          message: `${fieldName} contains invalid JSON`,
          severity: "error",
          entityType: entityType as any,
          rowIndex: index,
          columnName: fieldName,
          suggestions: ["Fix JSON syntax or use empty object {}"],
        })
      }
    }
  })
}

function validateTaskReferences(clients: any[], tasks: any[], errors: ValidationError[]) {
  if (!clients || !tasks || clients.length === 0 || tasks.length === 0) return

  const taskIds = new Set(tasks.map((task) => task.TaskID).filter(Boolean))

  clients.forEach((client, index) => {
    const requestedTasks = client.RequestedTaskIDs
    if (Array.isArray(requestedTasks)) {
      const unknownTasks = requestedTasks.filter((taskId) => !taskIds.has(taskId))
      if (unknownTasks.length > 0) {
        errors.push({
          id: `unknown-task-refs-${index}`,
          type: "unknownReferences",
          message: `Unknown task references: ${unknownTasks.join(", ")}`,
          severity: "error",
          entityType: "clients",
          rowIndex: index,
          columnName: "RequestedTaskIDs",
          suggestions: ["Remove unknown task IDs or add missing tasks"],
        })
      }
    }
  })
}

function validateWorkerCapacity(workers: any[], errors: ValidationError[]) {
  if (!workers || workers.length === 0) return

  workers.forEach((worker, index) => {
    const availableSlots = worker.AvailableSlots
    const maxLoad = worker.MaxLoadPerPhase

    if (Array.isArray(availableSlots) && typeof maxLoad === "number") {
      if (availableSlots.length < maxLoad) {
        errors.push({
          id: `overloaded-worker-${index}`,
          type: "overloadedWorker",
          message: `Worker has ${availableSlots.length} available slots but MaxLoadPerPhase is ${maxLoad}`,
          severity: "warning",
          entityType: "workers",
          rowIndex: index,
          columnName: "MaxLoadPerPhase",
          suggestions: [`Reduce MaxLoadPerPhase to ${availableSlots.length} or add more available slots`],
        })
      }
    }
  })
}

function validateSkillCoverage(workers: any[], tasks: any[], errors: ValidationError[]) {
  if (!workers || !tasks || workers.length === 0 || tasks.length === 0) return

  // Get all available skills from workers
  const availableSkills = new Set()
  workers.forEach((worker) => {
    if (Array.isArray(worker.Skills)) {
      worker.Skills.forEach((skill) => availableSkills.add(skill))
    }
  })

  // Check if all required skills are covered
  tasks.forEach((task, index) => {
    if (Array.isArray(task.RequiredSkills)) {
      const uncoveredSkills = task.RequiredSkills.filter((skill) => !availableSkills.has(skill))
      if (uncoveredSkills.length > 0) {
        errors.push({
          id: `uncovered-skills-${index}`,
          type: "uncoveredSkills",
          message: `Required skills not available in worker pool: ${uncoveredSkills.join(", ")}`,
          severity: "warning",
          entityType: "tasks",
          rowIndex: index,
          columnName: "RequiredSkills",
          suggestions: ["Add workers with these skills or remove skill requirements"],
        })
      }
    }
  })
}
