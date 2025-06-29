"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Sparkles, Lightbulb, Settings } from "lucide-react"
import type { BusinessRule } from "@/app/page"

interface RuleBuilderProps {
  data: {
    clients: any[]
    workers: any[]
    tasks: any[]
  }
  rules: BusinessRule[]
  onRulesChange: (rules: BusinessRule[]) => void
}

export function RuleBuilder({ data, rules, onRulesChange }: RuleBuilderProps) {
  const [naturalLanguageRule, setNaturalLanguageRule] = useState("")
  const [processingNL, setProcessingNL] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [newRule, setNewRule] = useState({
    type: "",
    name: "",
    description: "",
    config: {},
  })

  const ruleTypes = [
    { value: "coRun", label: "Co-run Tasks", description: "Tasks that must run together" },
    { value: "slotRestriction", label: "Slot Restriction", description: "Minimum common slots requirement" },
    { value: "loadLimit", label: "Load Limit", description: "Maximum slots per phase for workers" },
    { value: "phaseWindow", label: "Phase Window", description: "Allowed phases for specific tasks" },
    { value: "patternMatch", label: "Pattern Match", description: "Regex-based rules" },
    { value: "precedence", label: "Precedence Override", description: "Rule priority ordering" },
  ]

  const processNaturalLanguageRule = async () => {
    if (!naturalLanguageRule.trim()) return

    setProcessingNL(true)
    try {
      const response = await fetch("/api/ai/create-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naturalLanguage: naturalLanguageRule,
          data,
          existingRules: rules,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.rule) {
          const newRuleObj: BusinessRule = {
            id: Date.now().toString(),
            type: result.rule.type,
            name: result.rule.name,
            description: result.rule.description,
            config: result.rule.config,
            enabled: true,
          }
          onRulesChange([...rules, newRuleObj])
          setNaturalLanguageRule("")
        }
      }
    } catch (error) {
      console.error("Natural language rule processing error:", error)
    } finally {
      setProcessingNL(false)
    }
  }

  const generateAISuggestions = async () => {
    try {
      const response = await fetch("/api/ai/suggest-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, existingRules: rules }),
      })

      if (response.ok) {
        const result = await response.json()
        setAiSuggestions(result.suggestions || [])
      }
    } catch (error) {
      console.error("AI suggestions error:", error)
    }
  }

  const addRule = () => {
    if (!newRule.type || !newRule.name) return

    const rule: BusinessRule = {
      id: Date.now().toString(),
      type: newRule.type,
      name: newRule.name,
      description: newRule.description,
      config: newRule.config,
      enabled: true,
    }

    onRulesChange([...rules, rule])
    setNewRule({ type: "", name: "", description: "", config: {} })
  }

  const toggleRule = (ruleId: string) => {
    const updatedRules = rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule))
    onRulesChange(updatedRules)
  }

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter((rule) => rule.id !== ruleId)
    onRulesChange(updatedRules)
  }

  const applySuggestion = (suggestion: any) => {
    const rule: BusinessRule = {
      id: Date.now().toString(),
      type: suggestion.type,
      name: suggestion.name,
      description: suggestion.description,
      config: suggestion.config,
      enabled: true,
    }
    onRulesChange([...rules, rule])
    setAiSuggestions(aiSuggestions.filter((s) => s.id !== suggestion.id))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Business Rules Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="natural" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="natural">Natural Language</TabsTrigger>
              <TabsTrigger value="manual">Manual Builder</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
            </TabsList>

            {/* Natural Language Tab */}
            <TabsContent value="natural" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium">Describe your rule in plain English</h3>
                </div>
                <Textarea
                  placeholder="Example: Tasks T12 and T14 should always run together, or Workers in the Sales group should not work more than 3 slots per phase"
                  value={naturalLanguageRule}
                  onChange={(e) => setNaturalLanguageRule(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={processNaturalLanguageRule}
                  disabled={processingNL || !naturalLanguageRule.trim()}
                  className="w-full"
                >
                  {processingNL ? "Processing..." : "Create Rule with AI"}
                </Button>
              </div>
            </TabsContent>

            {/* Manual Builder Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Rule Type</label>
                  <Select value={newRule.type} onValueChange={(value) => setNewRule({ ...newRule, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Rule Name</label>
                  <Input
                    placeholder="Enter rule name"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe what this rule does"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={addRule} disabled={!newRule.type || !newRule.name}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </TabsContent>

            {/* AI Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <h3 className="font-medium">AI Rule Suggestions</h3>
                </div>
                <Button onClick={generateAISuggestions} variant="outline" size="sm">
                  Generate Suggestions
                </Button>
              </div>

              {aiSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <Card key={idx} className="border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{suggestion.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {suggestion.type}
                            </Badge>
                          </div>
                          <Button size="sm" onClick={() => applySuggestion(suggestion)}>
                            Apply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Click "Generate Suggestions" to get AI-powered rule recommendations</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Current Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{rule.name}</h4>
                      <Badge variant="outline">{rule.type}</Badge>
                      {!rule.enabled && <Badge variant="secondary">Disabled</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No rules created yet. Use the tabs above to create your first rule.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
