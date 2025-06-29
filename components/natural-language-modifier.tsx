"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wand2, Loader2, CheckCircle, AlertTriangle, Lightbulb } from "lucide-react"

interface NaturalLanguageModifierProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
  onDataChange: (data: { clients: any[]; workers: any[]; tasks: any[] }) => void
}

interface ModificationSuggestion {
  id: string
  description: string
  entityType: string
  changes: Array<{
    rowIndex: number
    field: string
    oldValue: any
    newValue: any
    confidence: number
  }>
  reasoning: string
}

export function NaturalLanguageModifier({ data, onDataChange }: NaturalLanguageModifierProps) {
  const [instruction, setInstruction] = useState("")
  const [processing, setProcessing] = useState(false)
  const [suggestions, setSuggestions] = useState<ModificationSuggestion[]>([])
  const [appliedChanges, setAppliedChanges] = useState<string[]>([])

  const processInstruction = async () => {
    if (!instruction.trim()) return

    setProcessing(true)
    try {
      const response = await fetch("/api/ai/modify-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          data,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuggestions(result.suggestions || [])
      }
    } catch (error) {
      console.error("Natural language modification error:", error)
    } finally {
      setProcessing(false)
    }
  }

  const applySuggestion = (suggestion: ModificationSuggestion) => {
    const newData = { ...data }

    suggestion.changes.forEach((change) => {
      const entityData = newData[suggestion.entityType as keyof typeof newData]
      if (entityData && entityData[change.rowIndex]) {
        entityData[change.rowIndex][change.field] = change.newValue
      }
    })

    onDataChange(newData)
    setAppliedChanges([...appliedChanges, suggestion.id])
  }

  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== suggestionId))
  }

  const exampleInstructions = [
    "Increase priority level by 1 for all clients in GroupA",
    "Set MaxLoadPerPhase to 5 for all workers with JavaScript skills",
    "Change duration to 3 for all tasks in the Development category",
    "Add 'Python' skill to workers who already have 'Django' skill",
    "Set PriorityLevel to 5 for clients requesting more than 5 tasks",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          Natural Language Data Modification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instruction Input */}
        <div className="space-y-3">
          <Textarea
            placeholder="Describe the changes you want to make to your data in plain English..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
          />
          <Button onClick={processInstruction} disabled={processing || !instruction.trim()} className="w-full">
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Changes...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Modification Suggestions
              </>
            )}
          </Button>
        </div>

        {/* Example Instructions */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Example instructions:</p>
          <div className="flex flex-wrap gap-2">
            {exampleInstructions.map((example, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 text-xs"
                onClick={() => setInstruction(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Safety Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>AI-Powered Modifications:</strong> All changes are suggested by AI and require your approval. Review
            each suggestion carefully before applying to ensure accuracy.
          </AlertDescription>
        </Alert>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              Modification Suggestions ({suggestions.length})
            </h4>

            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-yellow-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.entityType}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.changes.length} changes
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{suggestion.description}</p>
                        <p className="text-xs text-gray-600">{suggestion.reasoning}</p>
                      </div>

                      {!appliedChanges.includes(suggestion.id) && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => applySuggestion(suggestion)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Apply
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectSuggestion(suggestion.id)}>
                            Reject
                          </Button>
                        </div>
                      )}

                      {appliedChanges.includes(suggestion.id) && (
                        <div className="flex items-center gap-1 text-green-600 ml-4">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Applied</span>
                        </div>
                      )}
                    </div>

                    {/* Change Details */}
                    <div className="space-y-2">
                      {suggestion.changes.slice(0, 3).map((change, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                          <div className="font-medium">
                            Row {change.rowIndex + 1} • {change.field}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-red-600">"{String(change.oldValue)}"</span>
                            <span>→</span>
                            <span className="text-green-600">"{String(change.newValue)}"</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(change.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </div>
                      ))}

                      {suggestion.changes.length > 3 && (
                        <div className="text-xs text-gray-500">
                          ... and {suggestion.changes.length - 3} more changes
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Suggestions State */}
        {suggestions.length === 0 && instruction && !processing && (
          <div className="text-center py-4 text-gray-500">
            <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No modification suggestions generated. Try a different instruction.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
