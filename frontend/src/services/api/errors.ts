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
      code?: string;
      response?: {
        status?: number;
        data?: {
          message?: string;
          code?: string;
          error?: { type?: string; message?: string };
        };
      };
      message?: string;
    };
    const data = axiosErr.response?.data as
      | { message?: string; code?: string; error?: { message?: string; code?: number; status?: string } }
      | undefined;
    const message =
      data?.message ??
      data?.error?.message ??
      axiosErr.message ??
      'Request failed';
    return new ApiError(message, {
      status: axiosErr.response?.status ?? data?.error?.code,
      code: axiosErr.code ?? data?.code ?? data?.error?.status ?? data?.error?.message,
    });
  }

  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError('An unexpected error occurred');
}
