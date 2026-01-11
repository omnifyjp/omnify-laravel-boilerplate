/**
 * useFormMutation - Mutation với auto error handling cho Form
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import type { FormInstance } from "antd";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { getFormErrors, getValidationMessage } from "@/lib/api";

interface UseFormMutationOptions<TData, TResult> {
    form: FormInstance;
    mutationFn: (data: TData) => Promise<TResult>;
    /** Query keys to invalidate on success */
    invalidateKeys?: readonly (readonly unknown[])[];
    successMessage?: string;
    redirectTo?: string;
    onSuccess?: (data: TResult) => void;
    onError?: (error: unknown) => void;
}

export function useFormMutation<TData, TResult = unknown>({
    form,
    mutationFn,
    invalidateKeys = [],
    successMessage,
    redirectTo,
    onSuccess,
    onError,
}: UseFormMutationOptions<TData, TResult>) {
    const t = useTranslations();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn,
        onSuccess: (data) => {
            // Invalidate queries
            invalidateKeys?.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: [...key] });
            });

            // Show message
            if (successMessage) {
                message.success(t(successMessage as never));
            }

            // Redirect
            if (redirectTo) {
                router.push(redirectTo);
            }

            // Custom callback
            onSuccess?.(data);
        },
        onError: (error) => {
            // Set form field errors
            const formErrors = getFormErrors(error);
            if (formErrors.length > 0) {
                form.setFields(formErrors);
            }

            // Show general validation message (từ Laravel)
            const validationMessage = getValidationMessage(error);
            if (validationMessage) {
                message.error(validationMessage);
            }

            // Custom callback
            onError?.(error);
        },
    });
}
