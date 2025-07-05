// src/common/interfaces/paginate-result.interface.ts
export interface PaginateResult<T> {
  total: number;
  size: number;
  current: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
  records: T[];
}
