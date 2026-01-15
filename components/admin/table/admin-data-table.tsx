"use client"

import * as React from "react"
import { useQueryState, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs"
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  Table as TanstackTable,
} from "@tanstack/react-table"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { DataTable } from "@/components/ui/data-table"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTablePagination } from "./data-table-pagination"
import { AdminListResponse } from "@/types/admin-table"

export interface FilterConfig {
  param: string
  column: string
  title: string
  options: Array<{
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }>
}

export interface AdminDataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  endpoint: string
  searchKey: string
  searchPlaceholder?: string
  stateKey: string // Namespace for URL params (e.g., "content_posts", "creators")
  defaultSort?: { id: string; desc?: boolean }
  filterConfigs?: FilterConfig[]
  emptyStateText?: string
  loadingText?: string
  onRowClick?: (row: TData) => void
  // Optional: custom render for additional actions/buttons above the table
  headerActions?: React.ReactNode
}

export function AdminDataTable<TData>({
  columns,
  endpoint,
  searchKey,
  searchPlaceholder = "Search...",
  stateKey,
  defaultSort,
  filterConfigs = [],
  emptyStateText = "No results.",
  loadingText = "Loading...",
  onRowClick,
  headerActions,
}: AdminDataTableProps<TData>) {
  // URL state management with namespaced keys
  const [page, setPage] = useQueryState(
    `${stateKey}_page`,
    parseAsInteger.withDefault(1)
  )
  const [pageSize, setPageSize] = useQueryState(
    `${stateKey}_pageSize`,
    parseAsInteger.withDefault(10)
  )
  const [search, setSearch] = useQueryState(
    `${stateKey}_search`,
    parseAsString.withDefault("")
  )

  // Dynamic filter state for each filter config
  // Since hooks can't be in loops, we'll support up to 5 filters
  // Create hooks for each possible filter position (always call hooks in same order)
  const filter0 = useQueryState(
    filterConfigs[0] ? `${stateKey}_${filterConfigs[0].param}` : `${stateKey}_filter0_unused`,
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const filter1 = useQueryState(
    filterConfigs[1] ? `${stateKey}_${filterConfigs[1].param}` : `${stateKey}_filter1_unused`,
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const filter2 = useQueryState(
    filterConfigs[2] ? `${stateKey}_${filterConfigs[2].param}` : `${stateKey}_filter2_unused`,
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const filter3 = useQueryState(
    filterConfigs[3] ? `${stateKey}_${filterConfigs[3].param}` : `${stateKey}_filter3_unused`,
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const filter4 = useQueryState(
    filterConfigs[4] ? `${stateKey}_${filterConfigs[4].param}` : `${stateKey}_filter4_unused`,
    parseAsArrayOf(parseAsString).withDefault([])
  )

  // Only use the hooks that correspond to actual filter configs
  // Extract the actual values to avoid array reference issues
  const filter0Value = filter0[0]
  const filter1Value = filter1[0]
  const filter2Value = filter2[0]
  const filter3Value = filter3[0]
  const filter4Value = filter4[0]
  
  const filterStates = [filter0, filter1, filter2, filter3, filter4].slice(0, filterConfigs.length)

  const [data, setData] = React.useState<TData[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc ?? false }] : []
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const columnFiltersRef = React.useRef<ColumnFiltersState>([])
  const [table, setTable] = React.useState<TanstackTable<TData> | null>(null)
  const syncingFromUrl = React.useRef(false)
  const isResettingPage = React.useRef(false)
  
  // Keep ref in sync with state
  React.useEffect(() => {
    columnFiltersRef.current = columnFilters
  }, [columnFilters])

  // Build filter values object for API (memoized to prevent infinite loops)
  // Use the extracted values to ensure stable dependencies
  const filterValues = React.useMemo(() => {
    const values: Record<string, string[]> = {}
    const filterValuesArray = [filter0Value, filter1Value, filter2Value, filter3Value, filter4Value]
    filterConfigs.forEach((config, index) => {
      const filterValue = filterValuesArray[index]
      if (filterValue && filterValue.length > 0) {
        values[config.param] = filterValue
      }
    })
    return values
  }, [filterConfigs, filter0Value, filter1Value, filter2Value, filter3Value, filter4Value])

  // Create a stable string representation for dependency checking
  const filterValuesStr = React.useMemo(() => JSON.stringify(filterValues), [filterValues])

  // Reset page to 1 when filters change (but not when page itself changes)
  const prevFilterValuesStr = React.useRef<string>(filterValuesStr)
  React.useEffect(() => {
    if (prevFilterValuesStr.current !== filterValuesStr && !isResettingPage.current) {
      prevFilterValuesStr.current = filterValuesStr
      if (page !== 1) {
        isResettingPage.current = true
        setPage(1)
        // Reset flag after state update
        requestAnimationFrame(() => {
          isResettingPage.current = false
        })
      }
    } else {
      prevFilterValuesStr.current = filterValuesStr
    }
  }, [filterValuesStr, page, setPage])

  // Reset page to 1 when search changes
  const prevSearch = React.useRef<string>(search)
  React.useEffect(() => {
    if (prevSearch.current !== search && !isResettingPage.current) {
      prevSearch.current = search
      if (page !== 1) {
        isResettingPage.current = true
        setPage(1)
        // Reset flag after state update
        requestAnimationFrame(() => {
          isResettingPage.current = false
        })
      }
    } else {
      prevSearch.current = search
    }
  }, [search, page, setPage])

  // Fetch data when dependencies change - use direct effect to avoid callback dependency issues
  React.useEffect(() => {
    let cancelled = false
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("page", page.toString())
        params.append("pageSize", pageSize.toString())
        if (search) {
          params.append("search", search)
        }

        // Add filter params (comma-separated for multi-select)
        Object.entries(filterValues).forEach(([key, values]) => {
          if (values.length > 0) {
            params.append(key, values.join(","))
          }
        })

        // Add sorting if available
        if (sorting.length > 0) {
          const sort = sorting[0]
          params.append("sortBy", sort.id)
          params.append("sortOrder", sort.desc ? "desc" : "asc")
        }

        const response = await fetch(`${endpoint}?${params.toString()}`)

        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }

        const result: AdminListResponse<TData> = await response.json()
        
        if (!cancelled) {
          setData(result.rows || [])
          setTotal(result.total || 0)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching data:", error)
          toast.error("Failed to load data")
          setData([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    
    return () => {
      cancelled = true
    }
  }, [page, pageSize, search, filterValuesStr, sorting, endpoint])

  // Sync URL filter values to column filters for toolbar display (one-way sync from URL to table)
  // Use ref to track previous value and prevent unnecessary updates
  const prevFilterValuesStrForColumnSync = React.useRef<string>("")
  React.useEffect(() => {
    if (!table || syncingFromUrl.current) return
    if (prevFilterValuesStrForColumnSync.current === filterValuesStr) return
    
    prevFilterValuesStrForColumnSync.current = filterValuesStr
    
    const newFilters: ColumnFiltersState = []
    filterConfigs.forEach((config) => {
      const filterValue = filterValues[config.param]
      if (filterValue && filterValue.length > 0) {
        newFilters.push({
          id: config.column,
          value: filterValue,
        })
      }
    })
    
    // Check if actually different before updating (use ref to avoid dependency)
    const currentFilters = columnFiltersRef.current
    const currentFiltersStr = JSON.stringify([...currentFilters].sort((a, b) => a.id.localeCompare(b.id)))
    const newFiltersStr = JSON.stringify([...newFilters].sort((a, b) => a.id.localeCompare(b.id)))
    
    if (currentFiltersStr !== newFiltersStr) {
      syncingFromUrl.current = true
      setColumnFilters(newFilters)
      // Reset flag after state update
      requestAnimationFrame(() => {
        syncingFromUrl.current = false
      })
    }
  }, [table, filterValuesStr, filterConfigs, filterValues])

  // Create table instance
  const tableInstance = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Server-side pagination
    manualSorting: true, // Server-side sorting
    manualFiltering: true, // Server-side filtering
    pageCount: Math.ceil(total / pageSize),
    state: {
      sorting,
      columnFilters,
    },
  })

  // Set table instance once it's created (only update if tableInstance reference actually changes)
  React.useEffect(() => {
    if (tableInstance && table !== tableInstance) {
      setTable(tableInstance)
    }
  }, [tableInstance, table])

  // Handle filter changes from toolbar and sync to URL
  // Reset page to 1 when filters change
  const handleFilterChange = React.useCallback(
    (columnName: string, values: string[] | undefined) => {
      const config = filterConfigs.find((c) => c.column === columnName)
      if (config) {
        const configIndex = filterConfigs.indexOf(config)
        const [, setFilterValue] = filterStates[configIndex]
        setFilterValue(values || [])
        // Reset page to 1 when filter changes
        if (page !== 1) {
          setPage(1)
        }
      }
    },
    [filterConfigs, filterStates, page, setPage]
  )

  // Handle search changes and reset page to 1
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearch(value)
      // Reset page to 1 when search changes
      if (page !== 1) {
        setPage(1)
      }
    },
    [setSearch, page, setPage]
  )

  // Build filter configs for toolbar
  const toolbarFilters = filterConfigs.map((config) => ({
    column: config.column,
    param: config.param,
    title: config.title,
    options: config.options,
  }))

  return (
    <div className="space-y-4">
      {headerActions && <div>{headerActions}</div>}
      <DataTableToolbar
        table={table || undefined}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={toolbarFilters}
        onFilterChange={handleFilterChange}
        filterValues={filterValues}
      />
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">{loadingText}</span>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            onTableReady={setTable}
          />
          {table && (
            <DataTablePagination
              table={
                {
                  ...table,
                  getState: () => ({
                    pagination: {
                      pageIndex: page - 1,
                      pageSize,
                    },
                  }),
                  setPageSize: (size: number) => setPageSize(size),
                  setPageIndex: (index: number) => setPage(index + 1),
                  getCanPreviousPage: () => page > 1,
                  getCanNextPage: () => page * pageSize < total,
                  previousPage: () => setPage(Math.max(1, page - 1)),
                  nextPage: () => setPage(page + 1),
                  getPageCount: () => Math.ceil(total / pageSize),
                  getFilteredRowModel: () => ({
                    rows: data.map((row, idx) => ({
                      id: idx.toString(),
                      original: row,
                    })),
                  }),
                  getFilteredSelectedRowModel: () => ({
                    rows: [],
                  }),
                } as any
              }
            />
          )}
        </>
      )}
    </div>
  )
}
