"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Clock, Shield, Zap, Users, Target, BarChart3, ArrowUpDown } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface PriorityControlsProps {
  priorities: {
    cost: number
    speed: number
    quality: number
    flexibility: number
  }
  onPrioritiesChange: (priorities: { cost: number; speed: number; quality: number; flexibility: number }) => void
}

interface CriteriaItem {
  id: string
  label: string
  description: string
  icon: any
  color: string
  weight: number
}

interface PairwiseComparison {
  criteria1: string
  criteria2: string
  preference: number // 1-9 scale
}

const presetProfiles = {
  "maximize-fulfillment": {
    name: "Maximize Fulfillment",
    description: "Prioritize completing as many client requests as possible",
    weights: { cost: 20, speed: 40, quality: 30, flexibility: 10 },
    criteria: [
      { id: "client-priority", weight: 40 },
      { id: "task-completion", weight: 30 },
      { id: "resource-efficiency", weight: 20 },
      { id: "fairness", weight: 10 },
    ],
  },
  "fair-distribution": {
    name: "Fair Distribution",
    description: "Ensure equitable allocation across all clients and workers",
    weights: { cost: 25, speed: 25, quality: 25, flexibility: 25 },
    criteria: [
      { id: "fairness", weight: 40 },
      { id: "client-priority", weight: 25 },
      { id: "resource-efficiency", weight: 20 },
      { id: "task-completion", weight: 15 },
    ],
  },
  "minimize-workload": {
    name: "Minimize Workload",
    description: "Optimize for minimal resource utilization and cost",
    weights: { cost: 50, speed: 20, quality: 20, flexibility: 10 },
    criteria: [
      { id: "resource-efficiency", weight: 45 },
      { id: "cost-optimization", weight: 30 },
      { id: "task-completion", weight: 15 },
      { id: "client-priority", weight: 10 },
    ],
  },
  "quality-first": {
    name: "Quality First",
    description: "Prioritize high-quality outcomes over speed or cost",
    weights: { cost: 15, speed: 20, quality: 50, flexibility: 15 },
    criteria: [
      { id: "quality-assurance", weight: 40 },
      { id: "skill-matching", weight: 25 },
      { id: "client-priority", weight: 20 },
      { id: "resource-efficiency", weight: 15 },
    ],
  },
}

export function PriorityControls({ priorities, onPrioritiesChange }: PriorityControlsProps) {
  const [activeTab, setActiveTab] = useState("sliders")
  const [selectedProfile, setSelectedProfile] = useState<string>("")
  const [criteriaRanking, setCriteriaRanking] = useState<CriteriaItem[]>([
    {
      id: "client-priority",
      label: "Client Priority Level",
      description: "Higher priority clients get preference",
      icon: Target,
      color: "text-red-600",
      weight: 25,
    },
    {
      id: "task-completion",
      label: "Task Completion Rate",
      description: "Maximize number of completed tasks",
      icon: BarChart3,
      color: "text-blue-600",
      weight: 25,
    },
    {
      id: "resource-efficiency",
      label: "Resource Efficiency",
      description: "Optimal use of worker capacity",
      icon: TrendingUp,
      color: "text-green-600",
      weight: 25,
    },
    {
      id: "fairness",
      label: "Fairness Distribution",
      description: "Equitable allocation across clients",
      icon: Users,
      color: "text-purple-600",
      weight: 25,
    },
  ])
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([])
  const [currentComparison, setCurrentComparison] = useState<{ criteria1: string; criteria2: string } | null>(null)

  const updatePriority = (key: keyof typeof priorities, value: number[]) => {
    onPrioritiesChange({
      ...priorities,
      [key]: value[0],
    })
  }

  const applyPresetProfile = (profileKey: string) => {
    const profile = presetProfiles[profileKey as keyof typeof presetProfiles]
    if (profile) {
      onPrioritiesChange(profile.weights)
      setSelectedProfile(profileKey)

      // Update criteria ranking based on preset
      const updatedCriteria = criteriaRanking.map((criterion) => {
        const presetCriterion = profile.criteria.find((c) => c.id === criterion.id)
        return presetCriterion ? { ...criterion, weight: presetCriterion.weight } : criterion
      })
      setCriteriaRanking(updatedCriteria.sort((a, b) => b.weight - a.weight))
    }
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(criteriaRanking)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Recalculate weights based on position (higher position = higher weight)
    const updatedItems = items.map((item, index) => ({
      ...item,
      weight: Math.round(((items.length - index) / items.length) * 100),
    }))

    setCriteriaRanking(updatedItems)
  }

  const initiatePairwiseComparison = () => {
    const criteria = criteriaRanking.map((c) => c.id)
    const comparisons: PairwiseComparison[] = []

    for (let i = 0; i < criteria.length; i++) {
      for (let j = i + 1; j < criteria.length; j++) {
        comparisons.push({
          criteria1: criteria[i],
          criteria2: criteria[j],
          preference: 1, // Default to equal importance
        })
      }
    }

    setPairwiseComparisons(comparisons)
    setCurrentComparison({ criteria1: criteria[0], criteria2: criteria[1] })
  }

  const updatePairwiseComparison = (preference: number) => {
    if (!currentComparison) return

    const updatedComparisons = pairwiseComparisons.map((comp) =>
      comp.criteria1 === currentComparison.criteria1 && comp.criteria2 === currentComparison.criteria2
        ? { ...comp, preference }
        : comp,
    )

    setPairwiseComparisons(updatedComparisons)

    // Move to next comparison
    const currentIndex = pairwiseComparisons.findIndex(
      (comp) => comp.criteria1 === currentComparison.criteria1 && comp.criteria2 === currentComparison.criteria2,
    )

    if (currentIndex < pairwiseComparisons.length - 1) {
      const nextComp = pairwiseComparisons[currentIndex + 1]
      setCurrentComparison({ criteria1: nextComp.criteria1, criteria2: nextComp.criteria2 })
    } else {
      setCurrentComparison(null)
      calculateAHPWeights()
    }
  }

  const calculateAHPWeights = () => {
    // Simplified AHP calculation
    const criteria = criteriaRanking.map((c) => c.id)
    const matrix: number[][] = Array(criteria.length)
      .fill(null)
      .map(() => Array(criteria.length).fill(1))

    // Fill matrix based on pairwise comparisons
    pairwiseComparisons.forEach((comp) => {
      const i = criteria.indexOf(comp.criteria1)
      const j = criteria.indexOf(comp.criteria2)
      if (i !== -1 && j !== -1) {
        matrix[i][j] = comp.preference
        matrix[j][i] = 1 / comp.preference
      }
    })

    // Calculate weights (simplified eigenvector method)
    const weights = matrix.map((row) => {
      const product = row.reduce((acc, val) => acc * val, 1)
      return Math.pow(product, 1 / row.length)
    })

    const sum = weights.reduce((acc, val) => acc + val, 0)
    const normalizedWeights = weights.map((w) => Math.round((w / sum) * 100))

    // Update criteria ranking with calculated weights
    const updatedCriteria = criteriaRanking.map((criterion, index) => ({
      ...criterion,
      weight: normalizedWeights[index] || 0,
    }))

    setCriteriaRanking(updatedCriteria.sort((a, b) => b.weight - a.weight))
  }

  const priorityConfigs = [
    {
      key: "cost" as const,
      label: "Cost Optimization",
      description: "Minimize operational costs",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      key: "speed" as const,
      label: "Speed Priority",
      description: "Complete tasks quickly",
      icon: Zap,
      color: "text-blue-600",
    },
    {
      key: "quality" as const,
      label: "Quality Focus",
      description: "Ensure high-quality outcomes",
      icon: Shield,
      color: "text-purple-600",
    },
    {
      key: "flexibility" as const,
      label: "Flexibility",
      description: "Adapt to changing requirements",
      icon: Clock,
      color: "text-orange-600",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Advanced Prioritization</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sliders">Sliders</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="pairwise">Pairwise</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>

          {/* Sliders Tab */}
          <TabsContent value="sliders" className="space-y-6">
            {priorityConfigs.map((config) => {
              const Icon = config.icon
              const level =
                priorities[config.key] >= 80
                  ? { label: "Very High", color: "bg-red-500" }
                  : priorities[config.key] >= 60
                    ? { label: "High", color: "bg-orange-500" }
                    : priorities[config.key] >= 40
                      ? { label: "Medium", color: "bg-yellow-500" }
                      : priorities[config.key] >= 20
                        ? { label: "Low", color: "bg-blue-500" }
                        : { label: "Very Low", color: "bg-gray-500" }

              return (
                <div key={config.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {priorities[config.key]}%
                    </Badge>
                  </div>

                  <Slider
                    value={[priorities[config.key]]}
                    onValueChange={(value) => updatePriority(config.key, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{config.description}</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${level.color}`} />
                      <span>{level.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </TabsContent>

          {/* Drag & Drop Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Drag criteria to reorder by importance (top = most important)
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="criteria">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {criteriaRanking.map((criterion, index) => {
                      const Icon = criterion.icon
                      return (
                        <Draggable key={criterion.id} draggableId={criterion.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 border rounded-lg bg-white ${
                                snapshot.isDragging ? "shadow-lg" : "shadow-sm"
                              } transition-shadow`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                    <Icon className={`w-4 h-4 ${criterion.color}`} />
                                    <div>
                                      <div className="font-medium text-sm">{criterion.label}</div>
                                      <div className="text-xs text-gray-500">{criterion.description}</div>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline">{criterion.weight}%</Badge>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </TabsContent>

          {/* Pairwise Comparison Tab */}
          <TabsContent value="pairwise" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Compare criteria pairwise to build optimal weights using Analytic Hierarchy Process
            </div>

            {pairwiseComparisons.length === 0 ? (
              <Button onClick={initiatePairwiseComparison} className="w-full">
                Start Pairwise Comparison
              </Button>
            ) : currentComparison ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium">Which is more important?</h4>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-center">
                      <div className="font-medium">
                        {criteriaRanking.find((c) => c.id === currentComparison.criteria1)?.label}
                      </div>
                    </div>
                    <span className="text-gray-400">vs</span>
                    <div className="text-center">
                      <div className="font-medium">
                        {criteriaRanking.find((c) => c.id === currentComparison.criteria2)?.label}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 3, 5, 7, 9].map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => updatePairwiseComparison(value)}
                      className="text-xs"
                    >
                      {value === 1
                        ? "Equal"
                        : value === 3
                          ? "Moderate"
                          : value === 5
                            ? "Strong"
                            : value === 7
                              ? "Very Strong"
                              : "Extreme"}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-600 mb-2">✓ Pairwise comparison complete!</div>
                <div className="text-sm text-gray-600">Weights have been calculated and applied.</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initiatePairwiseComparison}
                  className="mt-2 bg-transparent"
                >
                  Restart Comparison
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">Choose from predefined optimization profiles</div>

            <div className="space-y-3">
              {Object.entries(presetProfiles).map(([key, profile]) => (
                <div
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProfile === key ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => applyPresetProfile(key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{profile.name}</h4>
                    {selectedProfile === key && <Badge className="bg-blue-600">Active</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{profile.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Cost: {profile.weights.cost}%</div>
                    <div>Speed: {profile.weights.speed}%</div>
                    <div>Quality: {profile.weights.quality}%</div>
                    <div>Flexibility: {profile.weights.flexibility}%</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Current Configuration Summary */}
        <div className="pt-4 border-t mt-6">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Current Configuration</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {priorityConfigs
              .sort((a, b) => priorities[b.key] - priorities[a.key])
              .map((config, idx) => (
                <div key={config.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">#{idx + 1}</span>
                    {config.label}
                  </span>
                  <span className="font-medium">{priorities[config.key]}%</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
