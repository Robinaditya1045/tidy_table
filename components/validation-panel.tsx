"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, CheckCircle, AlertCircle, Lightbulb } from "lucide-react"
import type { ValidationError } from "@/app/page"

interface ValidationPanelProps {
  errors: ValidationError[]
  onErrorClick: (error: ValidationError) => void
}

export function ValidationPanel({ errors, onErrorClick }: ValidationPanelProps) {
  const errorCount = errors.filter((e) => e.severity === "error").length
  const warningCount = errors.filter((e) => e.severity === "warning").length

  const groupedErrors = errors.reduce(
    (acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = []
      }
      acc[error.type].push(error)
      return acc
    },
    {} as Record<string, ValidationError[]>,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {errorCount === 0 && warningCount === 0 ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              All Validations Passed
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Validation Issues
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-2">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} Errors
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {warningCount} Warnings
            </Badge>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <Badge variant="default" className="text-xs bg-green-600">
              ✓ Clean Data
            </Badge>
          )}
        </div>

        {/* Error List */}
        {errors.length > 0 && (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {Object.entries(groupedErrors).map(([errorType, typeErrors]) => (
                <div key={errorType} className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    {errorType.replace(/([A-Z])/g, " $1").trim()}
                  </h4>
                  {typeErrors.map((error) => (
                    <div
                      key={error.id}
                      className="p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onErrorClick(error)}
                    >
                      <div className="flex items-start gap-2">
                        {error.severity === "error" ? (
                          <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900 break-words">{error.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {error.entityType} • Row {error.rowIndex + 1} • {error.columnName}
                          </p>
                          {error.suggestions && error.suggestions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">Suggestions:</span>
                              </div>
                              {error.suggestions.map((suggestion, idx) => (
                                <p key={idx} className="text-xs text-blue-600 ml-4">
                                  • {suggestion}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* No Errors State */}
        {errors.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No validation issues found. Your data looks great!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
