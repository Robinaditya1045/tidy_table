"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertTriangle, Zap, Loader2, RefreshCw } from "lucide-react"
import type { ValidationError } from "@/app/page"

interface AIErrorCorrectionProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
  validationErrors: ValidationError[]
  onDataChange: (data: { clients: any[]; workers: any[]; tasks: any[] }) => void
  onValidationErrors: (errors: ValidationError[]) => void
}

interface CorrectionSuggestion {
  id: string
  errorId: string
  description: string
  entityType: string
  rowIndex: number
  field: string
  currentValue: any
  suggestedValue: any
  confidence: number
  reasoning: string
  autoApplicable: boolean
}

export function AIErrorCorrection({
  data,
  validationErrors,
  onDataChange,
  onValidationErrors,
}: AIErrorCorrectionProps) {
  const [corrections, setCorrections] = useState<CorrectionSuggestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [appliedCorrections, setAppliedCorrections] = useState<string[]>([])
  const [autoFixProgress, setAutoFixProgress] = useState(0)

  const generateCorrections = async () => {
    if (validationErrors.length === 0) return

    setGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          errors: validationErrors,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setCorrections(result.corrections || [])
      }
    } catch (error) {
      console.error("AI correction generation error:", error)
    } finally {
      setGenerating(false)
    }
  }

  const applyCorrection = async (correction: CorrectionSuggestion) => {
    const newData = { ...data }
    const entityData = newData[correction.entityType as keyof typeof newData]

    if (entityData && entityData[correction.rowIndex]) {
      entityData[correction.rowIndex][correction.field] = correction.suggestedValue
    }

    onDataChange(newData)
    setAppliedCorrections([...appliedCorrections, correction.id])

    // Re-validate data
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
  }

  const autoFixAll = async () => {
    const autoApplicableCorrections = corrections.filter(
      (c) => c.autoApplicable && c.confidence > 0.8 && !appliedCorrections.includes(c.id),
    )

    if (autoApplicableCorrections.length === 0) return

    setAutoFixProgress(0)
    const newData = { ...data }

    for (let i = 0; i < autoApplicableCorrections.length; i++) {
      const correction = autoApplicableCorrections[i]
      const entityData = newData[correction.entityType as keyof typeof newData]

      if (entityData && entityData[correction.rowIndex]) {
        entityData[correction.rowIndex][correction.field] = correction.suggestedValue
      }

      setAppliedCorrections((prev) => [...prev, correction.id])
      setAutoFixProgress(((i + 1) / autoApplicableCorrections.length) * 100)

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    onDataChange(newData)

    // Re-validate data
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

    setAutoFixProgress(0)
  }

  // Auto-generate corrections when validation errors change
  useEffect(() => {
    if (validationErrors.length > 0 && corrections.length === 0) {
      generateCorrections()
    }
  }, [validationErrors])

  const errorCount = validationErrors.filter((e) => e.severity === "error").length
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length
  const availableCorrections = corrections.filter((c) => !appliedCorrections.includes(c.id))
  const highConfidenceCorrections = availableCorrections.filter((c) => c.confidence > 0.8)
  const autoApplicableCount = availableCorrections.filter((c) => c.autoApplicable && c.confidence > 0.8).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          AI Error Correction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-red-600">Errors</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-xs text-yellow-600">Warnings</div>
          </div>
        </div>

        {/* Action Buttons */}
        {validationErrors.length > 0 && (
          <div className="space-y-2">
            <Button
              onClick={generateCorrections}
              disabled={generating}
              className="w-full bg-transparent"
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating AI Corrections...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate AI Corrections
                </>
              )}
            </Button>

            {autoApplicableCount > 0 && (
              <Button
                onClick={autoFixAll}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={autoFixProgress > 0}
              >
                {autoFixProgress > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Auto-fixing... {Math.round(autoFixProgress)}%
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-fix {autoApplicableCount} High-Confidence Issues
                  </>
                )}
              </Button>
            )}

            {autoFixProgress > 0 && <Progress value={autoFixProgress} className="w-full" />}
          </div>
        )}

        {/* Corrections List */}
        {availableCorrections.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">AI Correction Suggestions</h4>
              <Badge variant="outline">{availableCorrections.length} available</Badge>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableCorrections.map((correction) => (
                <Card key={correction.id} className="border-blue-200">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {correction.entityType}
                            </Badge>
                            <Badge variant={correction.confidence > 0.8 ? "default" : "secondary"} className="text-xs">
                              {Math.round(correction.confidence * 100)}% confidence
                            </Badge>
                            {correction.autoApplicable && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                Auto-fixable
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{correction.description}</p>
                          <p className="text-xs text-gray-600 mt-1">{correction.reasoning}</p>
                        </div>

                        <Button size="sm" onClick={() => applyCorrection(correction)} className="ml-2">
                          Apply Fix
                        </Button>
                      </div>

                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <div className="font-medium">
                          Row {correction.rowIndex + 1} • {correction.field}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-red-600">Current: "{String(correction.currentValue)}"</span>
                          <span>→</span>
                          <span className="text-green-600">Suggested: "{String(correction.suggestedValue)}"</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Applied Corrections Summary */}
        {appliedCorrections.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{appliedCorrections.length} corrections applied successfully</span>
            </div>
          </div>
        )}

        {/* No Issues State */}
        {validationErrors.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-medium text-green-600 mb-1">All Clear!</h3>
            <p className="text-sm text-gray-600">No validation errors found in your data.</p>
          </div>
        )}

        {/* No Corrections Available */}
        {validationErrors.length > 0 && corrections.length === 0 && !generating && (
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI corrections available. Click "Generate AI Corrections" to analyze issues.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
