"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Edit3, Save, X } from "lucide-react"
import type { ValidationError } from "@/app/page"

interface DataGridProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
  onDataChange: (data: { clients: any[]; workers: any[]; tasks: any[] }) => void
  validationErrors: ValidationError[]
  onValidationErrors: (errors: ValidationError[]) => void
}

export function DataGrid({
  data,
  onDataChange,
  validationErrors,
  onValidationErrors,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ entityType: string; rowIndex: number; column: string } | null>(null)
  const [editingHeader, setEditingHeader] = useState<{ entityType: string; column: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editHeaderValue, setEditHeaderValue] = useState("")

  const getErrorsForCell = (entityType: string, rowIndex: number, column: string) => {
    return validationErrors.filter(
      (error) => error.entityType === entityType && error.rowIndex === rowIndex && error.columnName === column,
    )
  }

  const startEdit = (entityType: string, rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ entityType, rowIndex, column })
    // Handle array values for display
    if (Array.isArray(currentValue)) {
      setEditValue(currentValue.join(", "))
    } else {
      setEditValue(String(currentValue || ""))
    }
  }

  const saveEdit = async () => {
    if (!editingCell) return

    const { entityType, rowIndex, column } = editingCell
    const newData = { ...data }
    let processedValue = editValue

    // Process the value based on the field type
    if (column.includes("Skills") || column.includes("TaskIDs") || column.includes("Phases") || column.includes("Slots")) {
      // Convert comma-separated string back to array
      processedValue = editValue.split(",").map(v => {
        const trimmed = v.trim()
        // Convert to number if it's slots or phases
        if (column.includes("Slots") || column.includes("Phases")) {
          const num = Number(trimmed)
          return isNaN(num) ? trimmed : num
        }
        return trimmed
      }).filter(v => v !== "")
    } else if (column.includes("Level") || column.includes("Duration") || column.includes("Load") || column.includes("Concurrent")) {
      processedValue = Number(editValue) || 0
    }

    newData[entityType as keyof typeof data][rowIndex][column] = processedValue

    onDataChange(newData)

    // Re-validate after edit
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      })

      if (response.ok) {
        const result = await response.json()
        onValidationErrors(result.errors || [])
      }
    } catch (error) {
      console.error("Validation error:", error)
    }

    setEditingCell(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
  }

  const startHeaderEdit = (entityType: string, column: string) => {
    setEditingHeader({ entityType, column })
    setEditHeaderValue(column)
  }

  const saveHeaderEdit = async () => {
    if (!editingHeader || !editHeaderValue.trim()) return

    const { entityType, column: oldColumn } = editingHeader
    const newColumn = editHeaderValue.trim()

    if (oldColumn === newColumn) {
      cancelHeaderEdit()
      return
    }

    const newData = { ...data }
    const entityData = newData[entityType as keyof typeof data]

    // Rename the column in all rows
    entityData.forEach((row) => {
      if (row.hasOwnProperty(oldColumn)) {
        row[newColumn] = row[oldColumn]
        delete row[oldColumn]
      }
    })

    onDataChange(newData)

    // Re-validate after header edit
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      })

      if (response.ok) {
        const result = await response.json()
        onValidationErrors(result.errors || [])
      }
    } catch (error) {
      console.error("Validation error:", error)
    }

    setEditingHeader(null)
    setEditHeaderValue("")
  }

  const cancelHeaderEdit = () => {
    setEditingHeader(null)
    setEditHeaderValue("")
  }

  const renderTable = (entityType: string, entityData: any[]) => {
    if (!entityData || entityData.length === 0) {
      return <div className="text-center py-8 text-gray-500">No {entityType} data uploaded yet</div>
    }

    const columns = Object.keys(entityData[0])

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isEditingThisHeader =
                  editingHeader?.entityType === entityType && editingHeader?.column === column
                const headerErrors = validationErrors.filter(
                  (error) => error.entityType === entityType && error.columnName === column
                ).length

                return (
                  <TableHead key={column} className="min-w-[120px]">
                    {isEditingThisHeader ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editHeaderValue}
                          onChange={(e) => setEditHeaderValue(e.target.value)}
                          className="h-8 font-medium"
                          autoFocus
                          onKeyPress={(e) => e.key === "Enter" && saveHeaderEdit()}
                        />
                        <Button size="sm" variant="ghost" onClick={saveHeaderEdit}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelHeaderEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded group ${
                          headerErrors > 0 ? "text-red-600" : ""
                        }`}
                        onClick={() => startHeaderEdit(entityType, column)}
                      >
                        <span className="flex-1 font-medium">{column}</span>
                        <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        {headerErrors > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entityData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => {
                  const cellErrors = getErrorsForCell(entityType, rowIndex, column)
                  const isEditing =
                    editingCell?.entityType === entityType &&
                    editingCell?.rowIndex === rowIndex &&
                    editingCell?.column === column
                  const cellValue = row[column]

                  return (
                    <TableCell
                      key={column}
                      className={`relative ${cellErrors.length > 0 ? "bg-red-50 border-red-200" : ""}`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                          />
                          <Button size="sm" variant="ghost" onClick={saveEdit}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded group"
                          onClick={() => startEdit(entityType, rowIndex, column, cellValue)}
                        >
                          <span className="flex-1">
                            {Array.isArray(cellValue) ? cellValue.join(", ") : String(cellValue || "")}
                          </span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          {cellErrors.length > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                      )}

                      {cellErrors.length > 0 && (
                        <div className="absolute top-full left-0 z-10 mt-1 p-2 bg-red-100 border border-red-200 rounded shadow-lg text-xs max-w-xs">
                          {cellErrors.map((error) => (
                            <div key={error.id} className="text-red-700 mb-1">
                              {error.message}
                            </div>
                          ))}
                          {cellErrors[0].suggestions && (
                            <div className="text-blue-600 text-xs mt-1">
                              💡 {cellErrors[0].suggestions[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const entityCounts = {
    clients: data.clients.length,
    workers: data.workers.length,
    tasks: data.tasks.length,
  }

  const entityErrors = {
    clients: validationErrors.filter((e) => e.entityType === "clients").length,
    workers: validationErrors.filter((e) => e.entityType === "workers").length,
    tasks: validationErrors.filter((e) => e.entityType === "tasks").length,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Grid - Click any cell to edit</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              Clients
              <Badge variant={entityErrors.clients > 0 ? "destructive" : "secondary"}>{entityCounts.clients}</Badge>
              {entityErrors.clients > 0 && <AlertTriangle className="w-3 h-3" />}
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center gap-2">
              Workers
              <Badge variant={entityErrors.workers > 0 ? "destructive" : "secondary"}>{entityCounts.workers}</Badge>
              {entityErrors.workers > 0 && <AlertTriangle className="w-3 h-3" />}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              Tasks
              <Badge variant={entityErrors.tasks > 0 ? "destructive" : "secondary"}>{entityCounts.tasks}</Badge>
              {entityErrors.tasks > 0 && <AlertTriangle className="w-3 h-3" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">{renderTable("clients", data.clients)}</TabsContent>

          <TabsContent value="workers">{renderTable("workers", data.workers)}</TabsContent>

          <TabsContent value="tasks">{renderTable("tasks", data.tasks)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
