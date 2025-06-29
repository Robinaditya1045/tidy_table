"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, Settings, CheckCircle, AlertTriangle } from "lucide-react"
import type { BusinessRule, ValidationError } from "@/app/page"

interface ExportPanelProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
  rules: BusinessRule[]
  validationErrors: ValidationError[]
  priorities: any
  selectedProfile: string | null
  criteriaRanking: any
}

export function ExportPanel({
  data,
  rules,
  validationErrors,
  priorities,
  selectedProfile,
  criteriaRanking,
}: ExportPanelProps) {
  const [exportOptions, setExportOptions] = useState({
    includeClients: true,
    includeWorkers: true,
    includeTasks: true,
    includeRules: true,
    cleanDataOnly: true,
  })
  const [exporting, setExporting] = useState(false)

  const errorCount = validationErrors.filter((e) => e.severity === "error").length
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length
  const canExport = errorCount === 0

  const exportData = async () => {
    setExporting(true)

    try {
      // Prepare data for export
      const exportPayload = {
        data: {
          ...(exportOptions.includeClients && { clients: data.clients }),
          ...(exportOptions.includeWorkers && { workers: data.workers }),
          ...(exportOptions.includeTasks && { tasks: data.tasks }),
        },
        rules: exportOptions.includeRules ? rules.filter((r) => r.enabled) : [],
        prioritization: {
          weights: priorities,
          profile: selectedProfile || "custom",
          criteriaRanking: criteriaRanking,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: data.clients.length + data.workers.length + data.tasks.length,
          validationStatus: {
            errors: errorCount,
            warnings: warningCount,
            clean: errorCount === 0,
          },
        },
      }

      // Create and download CSV files
      if (exportOptions.includeClients && data.clients.length > 0) {
        downloadCSV(data.clients, "clients-cleaned.csv")
      }
      if (exportOptions.includeWorkers && data.workers.length > 0) {
        downloadCSV(data.workers, "workers-cleaned.csv")
      }
      if (exportOptions.includeTasks && data.tasks.length > 0) {
        downloadCSV(data.tasks, "tasks-cleaned.csv")
      }

      // Create and download enhanced rules.json with prioritization
      if (exportOptions.includeRules && rules.length > 0) {
        const enhancedRulesConfig = {
          rules: rules
            .filter((r) => r.enabled)
            .map((rule) => ({
              type: rule.type,
              name: rule.name,
              description: rule.description,
              config: rule.config,
            })),
          prioritization: exportPayload.prioritization,
          metadata: {
            createdAt: new Date().toISOString(),
            totalRules: rules.filter((r) => r.enabled).length,
            version: "2.0",
            aiEnhanced: true,
          },
        }
        downloadJSON(enhancedRulesConfig, "rules-enhanced.json")
      }
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setExporting(false)
    }
  }

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Export Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {canExport ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            Export Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Validation</span>
              {canExport ? (
                <Badge className="bg-green-600">✓ Ready</Badge>
              ) : (
                <Badge variant="destructive">{errorCount} Errors</Badge>
              )}
            </div>

            {warningCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Warnings</span>
                <Badge variant="secondary">{warningCount} Warnings</Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm">Business Rules</span>
              <Badge variant="outline">{rules.filter((r) => r.enabled).length} Active</Badge>
            </div>

            {!canExport && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  Please fix all validation errors before exporting. Check the validation panel for details.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clients"
                checked={exportOptions.includeClients}
                onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeClients: !!checked })}
              />
              <label htmlFor="clients" className="text-sm font-medium">
                Export Clients Data
              </label>
              <Badge variant="outline">{data.clients.length} records</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="workers"
                checked={exportOptions.includeWorkers}
                onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeWorkers: !!checked })}
              />
              <label htmlFor="workers" className="text-sm font-medium">
                Export Workers Data
              </label>
              <Badge variant="outline">{data.workers.length} records</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tasks"
                checked={exportOptions.includeTasks}
                onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeTasks: !!checked })}
              />
              <label htmlFor="tasks" className="text-sm font-medium">
                Export Tasks Data
              </label>
              <Badge variant="outline">{data.tasks.length} records</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rules"
                checked={exportOptions.includeRules}
                onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeRules: !!checked })}
              />
              <label htmlFor="rules" className="text-sm font-medium">
                Export Business Rules (rules.json)
              </label>
              <Badge variant="outline">{rules.filter((r) => r.enabled).length} active rules</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanOnly"
                checked={exportOptions.cleanDataOnly}
                onCheckedChange={(checked) => setExportOptions({ ...exportOptions, cleanDataOnly: !!checked })}
              />
              <label htmlFor="cleanOnly" className="text-sm font-medium">
                Export only validated data
              </label>
            </div>
          </div>

          {/* Export Preview */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Export Preview</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {exportOptions.includeClients && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>clients-cleaned.csv ({data.clients.length} records)</span>
                </div>
              )}
              {exportOptions.includeWorkers && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>workers-cleaned.csv ({data.workers.length} records)</span>
                </div>
              )}
              {exportOptions.includeTasks && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>tasks-cleaned.csv ({data.tasks.length} records)</span>
                </div>
              )}
              {exportOptions.includeRules && rules.filter((r) => r.enabled).length > 0 && (
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>rules.json ({rules.filter((r) => r.enabled).length} rules)</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <Card>
        <CardContent className="pt-6">
          <Button onClick={exportData} disabled={!canExport || exporting} className="w-full" size="lg">
            {exporting ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-pulse" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Clean Data & Rules
              </>
            )}
          </Button>

          {canExport && (
            <p className="text-xs text-gray-500 text-center mt-2">Files will be downloaded to your computer</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
