/**
 * useFormMutation - Re-export from @famgia/omnify-react
 *
 * The package hook handles form mutations with:
 * - Automatic validation error handling
 * - Query invalidation
 * - Success/error messages
 */

// Re-export directly from package
export { useFormMutation } from "@famgia/omnify-react";

// Re-export helpers from api.ts for convenience
export { getFormErrors, getValidationMessage, getFirstValidationError } from "@/lib/api";
