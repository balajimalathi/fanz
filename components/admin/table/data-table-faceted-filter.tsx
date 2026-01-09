"use client"

import * as React from "react"
import { CheckIcon, PlusCircleIcon } from "lucide-react"
import { Search } from "lucide-react"
import { Column } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  // Server-side filtering props
  selectedValues?: string[]
  onFilterChange?: (values: string[] | undefined) => void
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  selectedValues: propSelectedValues,
  onFilterChange,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  
  // Use server-side selectedValues if provided, otherwise fallback to column filter (client-side)
  const columnFilterValue = column?.getFilterValue() as string[] | undefined
  const serverSelectedValues = propSelectedValues || []
  const clientSelectedValues = columnFilterValue || []
  const activeSelectedValues = propSelectedValues !== undefined ? serverSelectedValues : clientSelectedValues
  const selectedValues = new Set(activeSelectedValues)
  
  const [searchValue, setSearchValue] = React.useState("")
  
  // Handle filter change - use onFilterChange for server-side, or column.setFilterValue for client-side
  const handleFilterChange = React.useCallback((values: string[] | undefined) => {
    if (onFilterChange) {
      // Server-side mode
      onFilterChange(values)
    } else if (column) {
      // Client-side mode
      column.setFilterValue(values)
    }
  }, [onFilterChange, column])

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={title}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.has(option.value)
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        const newSelectedValues = new Set(selectedValues)
                        if (isSelected) {
                          newSelectedValues.delete(option.value)
                        } else {
                          newSelectedValues.add(option.value)
                        }
                        const filterValue = Array.from(newSelectedValues)
                        handleFilterChange(
                          filterValue.length ? filterValue : undefined
                        )
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelectedValues = new Set(selectedValues)
                          if (checked) {
                            newSelectedValues.add(option.value)
                          } else {
                            newSelectedValues.delete(option.value)
                          }
                          const filterValue = Array.from(newSelectedValues)
                          handleFilterChange(
                            filterValue.length ? filterValue : undefined
                          )
                        }}
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {option.icon && (
                        <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-left">{option.label}</span>
                      {facets?.get(option.value) && (
                        <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                          {facets.get(option.value)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {selectedValues.size > 0 && (
                  <>
                    <Separator className="my-1" />
                    <button
                      onClick={() => handleFilterChange(undefined)}
                      className="w-full rounded-sm px-2 py-1.5 text-sm text-center hover:bg-accent hover:text-accent-foreground"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
