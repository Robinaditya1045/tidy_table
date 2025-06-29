"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, Database, Settings, Download } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { DataGrid } from "@/components/data-grid"
import { ValidationPanel } from "@/components/validation-panel"
import { RuleBuilder } from "@/components/rule-builder"
import { PriorityControls } from "@/components/priority-controls"
import { ExportPanel } from "@/components/export-panel"
import { NaturalLanguageSearch } from "@/components/natural-language-search"

export type DataEntity = "clients" | "workers" | "tasks"

export interface ValidationError {
  id: string
  type: string
  message: string
  severity: "error" | "warning"
  entityType: DataEntity
  rowIndex: number
  columnName: string
  suggestions?: string[]
}

export interface BusinessRule {
  id: string
  type: string
  name: string
  description: string
  config: any
  enabled: boolean
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "data" | "rules" | "export">("upload")
  const [uploadedData, setUploadedData] = useState<{
    clients: any[]
    workers: any[]
    tasks: any[]
  }>({
    clients: [],
    workers: [],
    tasks: [],
  })
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([])
  const [priorities, setPriorities] = useState({
    cost: 50,
    speed: 50,
    quality: 50,
    flexibility: 50,
  })

  const hasData = uploadedData.clients.length > 0 || uploadedData.workers.length > 0 || uploadedData.tasks.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Data Manager</h1>
          <p className="text-lg text-gray-600">
            Transform messy spreadsheets into clean, validated data with AI assistance
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Data
          </Button>
          <Button
            variant={activeTab === "data" ? "default" : "outline"}
            onClick={() => setActiveTab("data")}
            disabled={!hasData}
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            View & Edit Data
          </Button>
          <Button
            variant={activeTab === "rules" ? "default" : "outline"}
            onClick={() => setActiveTab("rules")}
            disabled={!hasData}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Business Rules
          </Button>
          <Button
            variant={activeTab === "export" ? "default" : "outline"}
            onClick={() => setActiveTab("export")}
            disabled={!hasData}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-3">
            {activeTab === "upload" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Upload Your Data Files
                  </CardTitle>
                  <CardDescription>
                    Upload CSV or XLSX files for clients, workers, and tasks. Our AI will help map columns and validate
                    data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload onDataUploaded={setUploadedData} onValidationErrors={setValidationErrors} />
                </CardContent>
              </Card>
            )}

            {activeTab === "data" && hasData && (
              <div className="space-y-6">
                <NaturalLanguageSearch data={uploadedData} />
                <DataGrid
                  data={uploadedData}
                  onDataChange={setUploadedData}
                  validationErrors={validationErrors}
                  onValidationErrors={setValidationErrors}
                />
              </div>
            )}

            {activeTab === "rules" && hasData && (
              <RuleBuilder data={uploadedData} rules={businessRules} onRulesChange={setBusinessRules} />
            )}

            {activeTab === "export" && hasData && (
              <ExportPanel data={uploadedData} rules={businessRules} validationErrors={validationErrors} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Validation Panel */}
            <ValidationPanel
              errors={validationErrors}
              onErrorClick={(error) => {
                // Navigate to the specific error location
                setActiveTab("data")
              }}
            />

            {/* Priority Controls */}
            {hasData && <PriorityControls priorities={priorities} onPrioritiesChange={setPriorities} />}

            {/* Quick Stats */}
            {hasData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Clients:</span>
                    <span className="font-medium">{uploadedData.clients.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Workers:</span>
                    <span className="font-medium">{uploadedData.workers.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tasks:</span>
                    <span className="font-medium">{uploadedData.tasks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rules:</span>
                    <span className="font-medium">{businessRules.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Errors:</span>
                    <span
                      className={`font-medium ${validationErrors.filter((e) => e.severity === "error").length > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {validationErrors.filter((e) => e.severity === "error").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
