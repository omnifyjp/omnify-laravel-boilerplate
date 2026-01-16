/**
 * useFormMutation - Re-export from @famgia/omnify-react with app-specific defaults
 *
 * This wrapper provides:
 * - Pre-configured router (Next.js)
 * - Pre-configured translateFn (next-intl)
 */

import { useFormMutation as useFormMutationBase, type UseFormMutationOptions as BaseOptions } from "@famgia/omnify-react";
import type { FormInstance } from "antd";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// Re-export types and helpers from package
export {
    type FormMutationRouter,
    type TranslateFn,
    type FormFieldError,
    getFormErrors,
    getValidationMessage,
    getFirstValidationError,
} from "@famgia/omnify-react";

/** App-specific options (router and translateFn are auto-provided) */
interface UseFormMutationOptions<TData, TResult> {
    form: FormInstance;
    mutationFn: (data: TData) => Promise<TResult>;
    invalidateKeys?: readonly (readonly unknown[])[];
    successMessage?: string;
    redirectTo?: string;
    onSuccess?: (data: TResult) => void;
    onError?: (error: unknown) => void;
}

/**
 * App-specific wrapper that auto-injects router and translateFn
 */
export function useFormMutation<TData, TResult = unknown>(
    options: UseFormMutationOptions<TData, TResult>
) {
    const router = useRouter();
    const t = useTranslations();

    return useFormMutationBase<TData, TResult>({
        ...options,
        router,
        translateFn: t as (key: string) => string,
    });
}
