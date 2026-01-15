# Admin Data Tables

This document explains how to use the reusable `AdminDataTable` component for creating admin listing pages with search, filters, pagination, and URL state management.

## Overview

The `AdminDataTable` component provides a complete data table solution with:
- Server-side pagination
- Server-side search
- Multi-select faceted filters
- URL state synchronization (using `nuqs`)
- Automatic toolbar and pagination controls
- Minimal code required per table

## Basic Usage

```tsx
import { ColumnDef } from "@tanstack/react-table"
import { AdminDataTable } from "@/components/admin/admin-data-table"

interface MyDataType {
  id: string
  name: string
  status: string
  createdAt: string
}

const columns: ColumnDef<MyDataType>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge>{row.original.status}</Badge>,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
]

export function MyTable() {
  return (
    <AdminDataTable<MyDataType>
      columns={columns}
      endpoint="/api/admin/my-endpoint"
      searchKey="name"
      searchPlaceholder="Search items..."
      stateKey="my_table"
      filterConfigs={[
        {
          param: "status",
          column: "status",
          title: "Status",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
        },
      ]}
    />
  )
}
```

## Props

### Required Props

- `columns: ColumnDef<TData, any>[]` - TanStack Table column definitions
- `endpoint: string` - API route path (e.g., `/api/admin/content/posts`)
- `searchKey: string` - Field name used for backend search
- `stateKey: string` - Unique namespace for URL params (e.g., `"content_posts"`, `"creators"`)

### Optional Props

- `searchPlaceholder?: string` - Placeholder text for search input (default: `"Search..."`)
- `defaultSort?: { id: string; desc?: boolean }` - Default sorting configuration
- `filterConfigs?: FilterConfig[]` - Array of filter configurations
- `emptyStateText?: string` - Text shown when no results (default: `"No results."`)
- `loadingText?: string` - Text shown while loading (default: `"Loading..."`)
- `onRowClick?: (row: TData) => void` - Callback when a row is clicked
- `headerActions?: React.ReactNode` - Custom actions/buttons to render above the table

## Filter Configuration

Each filter config has:
- `param: string` - URL query parameter name (e.g., `"status"`, `"postType"`)
- `column: string` - Table column accessor key (must match a column's `accessorKey`)
- `title: string` - Display name for the filter button
- `options: Array<{ label: string; value: string; icon?: React.ComponentType }>` - Filter options

Example:
```tsx
filterConfigs={[
  {
    param: "status",
    column: "status",
    title: "Status",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
    ],
  },
]}
```

## API Requirements

Your API endpoint must:

1. Accept query parameters:
   - `page` (1-based integer)
   - `pageSize` (integer)
   - `search` (string, optional)
   - Filter params (comma-separated values, e.g., `status=pending,approved`)

2. Return the standardized response shape:
```typescript
{
  rows: TData[],
  total: number
}
```

Example API implementation:
```typescript
import { AdminListResponse } from "@/types/admin-table"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "10")
  const search = searchParams.get("search")
  const status = searchParams.get("status") // Comma-separated

  // Build where conditions...
  const whereClause = /* ... */

  // Get total count
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(myTable)
    .where(whereClause)

  // Get paginated results
  const rows = await db
    .select()
    .from(myTable)
    .where(whereClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const response: AdminListResponse<MyDataType> = {
    rows,
    total: totalCount,
  }

  return NextResponse.json(response)
}
```

## URL State Management

All state (page, pageSize, search, filters) is automatically synced to the URL using `nuqs`. The state keys are namespaced using the `stateKey` prop:

- `{stateKey}_page`
- `{stateKey}_pageSize`
- `{stateKey}_search`
- `{stateKey}_{filterParam}` for each filter

This allows:
- Bookmarkable filtered/paginated views
- Shareable URLs
- Browser back/forward navigation
- State persistence on page refresh

## Examples

See the following files for complete examples:
- `components/admin/content-moderation-table.tsx` - Posts and comments with tabs
- `components/admin/creator-approval-table.tsx` - Creator approval workflow
- `components/admin/disputes-table.tsx` - Disputes with status and type filters
- `components/admin/reports-table.tsx` - Reports with status and type filters

## Tips

1. **Unique stateKey**: Use a unique `stateKey` for each table instance, especially when multiple tables are on the same page or in tabs.

2. **Column accessorKeys**: Make sure filter `column` values match your column definitions' `accessorKey` values for proper filter synchronization.

3. **Server-side filtering**: All filtering is done server-side. The table columns are for display only - don't rely on client-side filtering.

4. **Filter values**: Filter values are sent as comma-separated strings in the URL. Your API should split and handle multiple values.

5. **Actions in cells**: You can include action buttons in your column definitions. Use local state (like `processing`) to track which row is being processed.
