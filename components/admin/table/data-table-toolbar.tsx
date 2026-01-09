"use client"

import { Cross, X } from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

interface DataTableToolbarProps<TData> {
  table?: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: Array<{
    column: string
    title: string
    options: Array<{
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }>
  }>
  onFilterChange?: (column: string, value: string[] | undefined) => void
  filterValues?: Record<string, string[]>
}

export function DataTableToolbar<TData>({
  table,
  searchKey = "name",
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  onFilterChange,
  filterValues = {},
}: DataTableToolbarProps<TData>) {
  const isFiltered = table
    ? table.getState().columnFilters.length > 0
    : Object.keys(filterValues).length > 0 || (searchValue && searchValue.length > 0)

  const handleReset = () => {
    if (table) {
      table.resetColumnFilters()
    } else {
      if (onSearchChange) onSearchChange("")
      if (onFilterChange) {
        filters.forEach((filter) => onFilterChange(filter.column, undefined))
      }
    }
  }

  const currentSearchValue = table
    ? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")
    : searchValue ?? ""

  const handleClearSearch = () => {
    if (table) {
      table.getColumn(searchKey)?.setFilterValue("")
    } else if (onSearchChange) {
      onSearchChange("")
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            value={currentSearchValue}
            onChange={(event) => {
              const value = event.target.value
              if (table) {
                table.getColumn(searchKey)?.setFilterValue(value)
              } else if (onSearchChange) {
                onSearchChange(value)
              }
            }}
            className="h-8 w-[150px] lg:w-[250px] pr-8"
          />
          {currentSearchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        {filters.map((filter) => {
          if (table) {
            const column = table.getColumn(filter.column)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.column}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          } else {
            // For non-table mode, we need a custom implementation
            // For now, skip filters when table is not provided
            return null
          }
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={handleReset}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
