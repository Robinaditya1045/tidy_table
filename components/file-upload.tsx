"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import type { ValidationError } from "@/app/page"
import { SampleDataLoader } from "@/components/sample-data-loader"

interface FileUploadProps {
  onDataUploaded: (data: { clients: any[]; workers: any[]; tasks: any[] }) => void
  onValidationErrors: (errors: ValidationError[]) => void
}

export function FileUpload({ onDataUploaded, onValidationErrors }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    clients?: File
    workers?: File
    tasks?: File
  }>({})
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [aiProcessing, setAiProcessing] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = { ...uploadedFiles }

      acceptedFiles.forEach((file) => {
        const fileName = file.name.toLowerCase()
        if (fileName.includes("client")) {
          newFiles.clients = file
        } else if (fileName.includes("worker")) {
          newFiles.workers = file
        } else if (fileName.includes("task")) {
          newFiles.tasks = file
        }
      })

      setUploadedFiles(newFiles)
    },
    [uploadedFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  })

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          let workbook: XLSX.WorkBook

          if (file.name.endsWith(".csv")) {
            workbook = XLSX.read(data, { type: "binary" })
          } else {
            workbook = XLSX.read(data, { type: "array" })
          }

          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }

      if (file.name.endsWith(".csv")) {
        reader.readAsBinaryString(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  const processWithAI = async (data: any[], entityType: string) => {
    try {
      const response = await fetch("/api/ai/parse-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, entityType }),
      })

      if (!response.ok) throw new Error("AI processing failed")

      const result = await response.json()
      return result.processedData
    } catch (error) {
      console.error("AI processing error:", error)
      return data // Fallback to original data
    }
  }

  const validateData = async (data: { clients: any[]; workers: any[]; tasks: any[] }) => {
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Validation failed")

      const result = await response.json()
      return result.errors || []
    } catch (error) {
      console.error("Validation error:", error)
      return []
    }
  }

  const processFiles = async () => {
    if (!uploadedFiles.clients && !uploadedFiles.workers && !uploadedFiles.tasks) {
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      const data = { clients: [], workers: [], tasks: [] }
      let step = 0
      const totalSteps = Object.keys(uploadedFiles).length * 2 + 1 // Parse + AI process + validate

      // Parse files
      for (const [entityType, file] of Object.entries(uploadedFiles)) {
        if (file) {
          setProgress((step / totalSteps) * 100)
          const parsedData = await parseFile(file)
          data[entityType as keyof typeof data] = parsedData
          step++
        }
      }

      // AI processing
      setAiProcessing(true)
      for (const [entityType, entityData] of Object.entries(data)) {
        if (entityData.length > 0) {
          setProgress((step / totalSteps) * 100)
          const processedData = await processWithAI(entityData, entityType)
          data[entityType as keyof typeof data] = processedData
          step++
        }
      }

      // Validation
      setProgress((step / totalSteps) * 100)
      const errors = await validateData(data)

      setProgress(100)
      onDataUploaded(data)
      onValidationErrors(errors)
    } catch (error) {
      console.error("Processing error:", error)
    } finally {
      setProcessing(false)
      setAiProcessing(false)
      setProgress(0)
    }
  }

  const removeFile = (entityType: string) => {
    const newFiles = { ...uploadedFiles }
    delete newFiles[entityType as keyof typeof newFiles]
    setUploadedFiles(newFiles)
  }

  return (
    <div className="space-y-6">
      <SampleDataLoader onDataLoaded={onDataUploaded} />
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag & drop your CSV or XLSX files here</p>
            <p className="text-sm text-gray-500">
              Upload files for clients, workers, and tasks (files should contain the entity name)
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files */}
      {Object.keys(uploadedFiles).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Uploaded Files:</h3>
          {Object.entries(uploadedFiles).map(([entityType, file]) => (
            <Card key={entityType}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium capitalize">{entityType}</p>
                    <p className="text-sm text-gray-500">{file?.name}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => removeFile(entityType)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {aiProcessing ? "AI is processing and mapping your data..." : "Processing files..."}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Process Button */}
      {Object.keys(uploadedFiles).length > 0 && !processing && (
        <Button onClick={processFiles} className="w-full" size="lg">
          <CheckCircle className="w-4 h-4 mr-2" />
          Process Files with AI
        </Button>
      )}

      {/* AI Features Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Features:</strong> Our AI will automatically map column headers to the correct data structure, even
          if they're named differently or in a different order. It will also run advanced validations and suggest data
          corrections.
        </AlertDescription>
      </Alert>
    </div>
  )
}
