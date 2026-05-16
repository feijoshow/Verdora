/**
 * Normalized API error for consistent handling across services.
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Map Axios/fetch errors into ApiError */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as {
      response?: { status?: number; data?: { message?: string; code?: string } };
      message?: string;
    };
    return new ApiError(
      axiosErr.response?.data?.message ?? axiosErr.message ?? 'Request failed',
      { status: axiosErr.response?.status, code: axiosErr.response?.data?.code },
    );
  }

  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError('An unexpected error occurred');
}
