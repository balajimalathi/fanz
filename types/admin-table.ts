/**
 * Standard response shape for admin list APIs
 */
export interface AdminListResponse<T> {
  rows: T[]
  total: number
}
