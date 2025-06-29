"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, Sparkles } from "lucide-react"

interface NaturalLanguageSearchProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
}

export function NaturalLanguageSearch({ data }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{
    clients: any[]
    workers: any[]
    tasks: any[]
    explanation: string
  } | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setSearching(true)
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, data }),
      })

      if (response.ok) {
        const searchResults = await response.json()
        setResults(searchResults)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearching(false)
    }
  }

  const exampleQueries = [
    "Show me all tasks with duration more than 2 phases",
    "Find workers available in phase 1 and 2",
    "Tasks that require JavaScript skills",
    "Clients with high priority projects",
    "Workers with more than 5 available slots",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI-Powered Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about your data in plain English..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Example Queries */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setQuery(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4 border-t pt-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-800">
                <strong>AI Explanation:</strong> {results.explanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Clients ({results.clients.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.clients.length > 0 ? (
                    results.clients.map((client, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded border">
                        <div className="font-medium">
                          {client.ClientID && <span>ID: {client.ClientID}</span>}
                          {client.Name && <span className="ml-2">Name: {client.Name}</span>}
                        </div>
                        {client.PriorityLevel && (
                          <div className="text-gray-600">Priority: {client.PriorityLevel}</div>
                        )}
                        {client.GroupTag && (
                          <div className="text-gray-600">Group: {client.GroupTag}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 p-2">No clients found</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Workers ({results.workers.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.workers.length > 0 ? (
                    results.workers.map((worker, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded border">
                        <div className="font-medium">
                          {worker.WorkerID && <span>ID: {worker.WorkerID}</span>}
                          {worker.Name && <span className="ml-2">Name: {worker.Name}</span>}
                        </div>
                        {worker.Skills && (
                          <div className="text-gray-600">Skills: {Array.isArray(worker.Skills) ? worker.Skills.join(', ') : worker.Skills}</div>
                        )}
                        {worker.AvailableSlots && (
                          <div className="text-gray-600">Available: {Array.isArray(worker.AvailableSlots) ? worker.AvailableSlots.join(', ') : worker.AvailableSlots}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 p-2">No workers found</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Tasks ({results.tasks.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.tasks.length > 0 ? (
                    results.tasks.map((task, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded border">
                        <div className="font-medium">
                          {task.TaskID && <span>ID: {task.TaskID}</span>}
                          {task.Name && <span className="ml-2">Name: {task.Name}</span>}
                        </div>
                        {task.Duration && (
                          <div className="text-gray-600">Duration: {task.Duration}</div>
                        )}
                        {task.RequiredSkills && (
                          <div className="text-gray-600">Skills: {Array.isArray(task.RequiredSkills) ? task.RequiredSkills.join(', ') : task.RequiredSkills}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 p-2">No tasks found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
