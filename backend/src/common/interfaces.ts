/** JWT payload shape stored in request.user after authentication */
export interface JwtPayload {
  sub: string;           // user UUID
  wallet_address: string;
  user_role: string;     // UserRole enum value
  role: string;          // 'authenticated' for Supabase compat
  iat?: number;
  exp?: number;
}

/** Standard API response envelope */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Pagination query */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
