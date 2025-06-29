"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2 } from "lucide-react"

interface SampleDataLoaderProps {
  onDataLoaded: (data: { clients: any[]; workers: any[]; tasks: any[] }) => void
}

export function SampleDataLoader({ onDataLoaded }: SampleDataLoaderProps) {
  const [loading, setLoading] = useState(false)

  const loadSampleData = async () => {
    setLoading(true)
    try {
      // Generate comprehensive sample data
      const sampleData = {
        clients: [
          {
            ClientID: "C001",
            ClientName: "TechCorp Solutions",
            PriorityLevel: 5,
            RequestedTaskIDs: "T001,T003,T005",
            GroupTag: "Enterprise",
            AttributesJSON: '{"budget": 100000, "deadline": "2024-03-15", "contact": "john@techcorp.com"}',
          },
          {
            ClientID: "C002",
            ClientName: "StartupXYZ",
            PriorityLevel: 3,
            RequestedTaskIDs: "T002,T004",
            GroupTag: "Startup",
            AttributesJSON: '{"budget": 25000, "deadline": "2024-04-01", "contact": "mary@startupxyz.com"}',
          },
          {
            ClientID: "C003",
            ClientName: "Global Industries",
            PriorityLevel: 4,
            RequestedTaskIDs: "T001,T002,T006",
            GroupTag: "Enterprise",
            AttributesJSON: '{"budget": 75000, "deadline": "2024-03-30", "contact": "bob@global.com"}',
          },
        ],
        workers: [
          {
            WorkerID: "W001",
            WorkerName: "Alice Johnson",
            Skills: "JavaScript,React,Node.js",
            AvailableSlots: [1, 2, 3],
            MaxLoadPerPhase: 3,
            WorkerGroup: "Frontend",
            QualificationLevel: 5,
          },
          {
            WorkerID: "W002",
            WorkerName: "Bob Smith",
            Skills: "Python,Django,PostgreSQL",
            AvailableSlots: [2, 3, 4],
            MaxLoadPerPhase: 4,
            WorkerGroup: "Backend",
            QualificationLevel: 4,
          },
          {
            WorkerID: "W003",
            WorkerName: "Carol Davis",
            Skills: "JavaScript,Python,React,Django",
            AvailableSlots: [1, 3, 5],
            MaxLoadPerPhase: 2,
            WorkerGroup: "Fullstack",
            QualificationLevel: 5,
          },
        ],
        tasks: [
          {
            TaskID: "T001",
            TaskName: "Frontend Development",
            Category: "Development",
            Duration: 2,
            RequiredSkills: "JavaScript,React",
            PreferredPhases: [1, 2],
            MaxConcurrent: 2,
          },
          {
            TaskID: "T002",
            TaskName: "Backend API",
            Category: "Development",
            Duration: 3,
            RequiredSkills: "Python,Django",
            PreferredPhases: [2, 3],
            MaxConcurrent: 1,
          },
          {
            TaskID: "T003",
            TaskName: "Database Design",
            Category: "Architecture",
            Duration: 1,
            RequiredSkills: "PostgreSQL",
            PreferredPhases: [1],
            MaxConcurrent: 1,
          },
          {
            TaskID: "T004",
            TaskName: "UI/UX Design",
            Category: "Design",
            Duration: 2,
            RequiredSkills: "JavaScript,React",
            PreferredPhases: [1, 2],
            MaxConcurrent: 1,
          },
          {
            TaskID: "T005",
            TaskName: "Testing & QA",
            Category: "Testing",
            Duration: 1,
            RequiredSkills: "JavaScript,Python",
            PreferredPhases: [4, 5],
            MaxConcurrent: 3,
          },
          {
            TaskID: "T006",
            TaskName: "DevOps Setup",
            Category: "Infrastructure",
            Duration: 2,
            RequiredSkills: "Python,Django",
            PreferredPhases: [3, 4],
            MaxConcurrent: 1,
          },
        ],
      }

      onDataLoaded(sampleData)
    } catch (error) {
      console.error("Error loading sample data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <FileText className="w-5 h-5" />
          Sample Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-700">
          Load comprehensive sample data to explore all features of the AI Data Manager.
        </p>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <Badge variant="outline" className="bg-white">
              3 Clients
            </Badge>
            <div className="text-blue-600 mt-1">Enterprise & Startup</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="bg-white">
              3 Workers
            </Badge>
            <div className="text-blue-600 mt-1">Multi-skilled Team</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="bg-white">
              6 Tasks
            </Badge>
            <div className="text-blue-600 mt-1">Full Project Scope</div>
          </div>
        </div>

        <Button onClick={loadSampleData} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Sample Data...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Load Sample Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
