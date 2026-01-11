import axios, { AxiosError } from "axios";

// =============================================================================
// Types - Laravel Response Formats
// =============================================================================

/** Laravel Pagination Response */
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/** Laravel Validation Error (422) */
export interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}

/** API Error type for i18n */
export type ApiErrorType =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "sessionExpired"
  | "tooManyRequests"
  | "serverError"
  | "networkError"
  | "validation";

// =============================================================================
// Axios Instance
// =============================================================================

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Required for Sanctum cookies
  withXSRFToken: true, // Auto send XSRF-TOKEN cookie as header
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// =============================================================================
// Error Handler - Can be customized with i18n
// =============================================================================

type ErrorHandler = (type: ApiErrorType) => void;
let errorHandler: ErrorHandler | null = null;

/** Set custom error handler (call from app with i18n) */
export const setApiErrorHandler = (handler: ErrorHandler) => {
  errorHandler = handler;
};

// =============================================================================
// Response Interceptor
// =============================================================================

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ValidationError>) => {
    const status = error.response?.status;

    switch (status) {
      case 401:
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/login";
        }
        break;

      case 403:
        errorHandler?.("forbidden");
        break;

      case 404:
        errorHandler?.("notFound");
        break;

      case 419:
        errorHandler?.("sessionExpired");
        break;

      case 422:
        // Validation - handled by form
        break;

      case 429:
        errorHandler?.("tooManyRequests");
        break;

      case 500:
      case 502:
      case 503:
        errorHandler?.("serverError");
        break;

      default:
        if (!error.response) {
          errorHandler?.("networkError");
        }
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// Sanctum Helpers
// =============================================================================

/** Initialize CSRF cookie - call before login/register */
export const csrf = () => api.get("/sanctum/csrf-cookie");

// =============================================================================
// Helper to extract validation errors for Ant Design Form
// =============================================================================

/**
 * Extract field errors for form.setFields()
 * Supports:
 * - Simple fields: "email" → name: "email"
 * - Dot notation: "user.name" → name: ["user", "name"]
 * - Array notation: "items.0.name" → name: ["items", 0, "name"]
 * 
 * @example form.setFields(getFormErrors(error))
 */
export const getFormErrors = (error: unknown) => {
  const axiosError = error as AxiosError<ValidationError>;
  const errors = axiosError.response?.data?.errors;

  if (!errors) return [];

  return Object.entries(errors).map(([fieldName, messages]) => ({
    // Convert "user.name" or "items.0.name" to array path for Ant Design
    name: fieldName.includes(".")
      ? fieldName.split(".").map((part) => (/^\d+$/.test(part) ? parseInt(part, 10) : part))
      : fieldName,
    errors: messages,
  }));
};

/**
 * Extract validation message từ Laravel 422 response
 * @example "The name_lastname field is required. (and 3 more errors)"
 */
export const getValidationMessage = (error: unknown): string | null => {
  const axiosError = error as AxiosError<ValidationError>;

  // Only for 422 validation errors
  if (axiosError.response?.status !== 422) return null;

  return axiosError.response?.data?.message ?? null;
};

/**
 * Get first error message from validation errors
 * Useful when field names don't match form fields
 */
export const getFirstValidationError = (error: unknown): string | null => {
  const axiosError = error as AxiosError<ValidationError>;
  const errors = axiosError.response?.data?.errors;

  if (!errors) return null;

  const firstField = Object.keys(errors)[0];
  return firstField ? errors[firstField][0] : null;
};

export default api;
