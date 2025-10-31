"use client"

import * as React from "react"
import { Search, Filter, X, ChevronDown } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface SearchFiltersProps {
  onSearch?: (filters: SearchFilters) => void
  initialFilters?: Partial<SearchFilters>
  className?: string
}

export interface SearchFilters {
  query: string
  status: string[]
  priority: string[]
  tags: string[]
  sortBy: "recent" | "popular" | "trending"
  application: string
  company: string
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "fixed", label: "Fixed" },
  { value: "wont_fix", label: "Won't Fix" }
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
]

const tagOptions = [
  { value: "ui", label: "UI" },
  { value: "crash", label: "Crash" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "accessibility", label: "Accessibility" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "web", label: "Web" }
]

const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "popular", label: "Most Popular" },
  { value: "trending", label: "Trending" }
]

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  initialFilters = {},
  className
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [filters, setFilters] = React.useState<SearchFilters>({
    query: "",
    status: [],
    priority: [],
    tags: [],
    sortBy: "recent",
    application: "",
    company: "",
    ...initialFilters
  })

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (onSearch) {
      onSearch(newFilters)
    }
  }

  const handleMultiSelectChange = (key: "status" | "priority" | "tags", value: string) => {
    const currentValues = filters[key]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    handleFilterChange(key, newValues)
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: "",
      status: [],
      priority: [],
      tags: [],
      sortBy: "recent",
      application: "",
      company: ""
    }
    setFilters(clearedFilters)
    if (onSearch) {
      onSearch(clearedFilters)
    }
  }

  const hasActiveFilters = 
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.tags.length > 0 ||
    filters.application ||
    filters.company

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Query */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs, applications, companies..."
            value={filters.query}
            onChange={(e) => handleFilterChange("query", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort By */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium min-w-fit">Sort by:</span>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange("sortBy", value as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.status.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMultiSelectChange("status", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.priority.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMultiSelectChange("priority", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.tags.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMultiSelectChange("tags", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Application and Company Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Application</label>
                <Input
                  placeholder="Filter by application..."
                  value={filters.application}
                  onChange={(e) => handleFilterChange("application", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Company</label>
                <Input
                  placeholder="Filter by company..."
                  value={filters.company}
                  onChange={(e) => handleFilterChange("company", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              {filters.status.map((status) => (
                <span
                  key={`status-${status}`}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  Status: {statusOptions.find(o => o.value === status)?.label}
                  <button
                    onClick={() => handleMultiSelectChange("status", status)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filters.priority.map((priority) => (
                <span
                  key={`priority-${priority}`}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800"
                >
                  Priority: {priorityOptions.find(o => o.value === priority)?.label}
                  <button
                    onClick={() => handleMultiSelectChange("priority", priority)}
                    className="ml-1 hover:text-orange-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span
                  key={`tag-${tag}`}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                >
                  Tag: {tagOptions.find(o => o.value === tag)?.label}
                  <button
                    onClick={() => handleMultiSelectChange("tags", tag)}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}