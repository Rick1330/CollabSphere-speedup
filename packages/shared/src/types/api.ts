import type { ErrorCode } from "../constants/error-codes.js";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ValidationDetail {
  field: string;
  message: string;
  rule: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationDetail[];
    requestId: string;
    timestamp: string;
  };
}
