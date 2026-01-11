"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { authService, LoginInput, RegisterInput } from "@/services/auth";
import { getFormErrors } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { FormInstance } from "antd";

/**
 * useAuth Hook - Complete auth state management
 *
 * @see .claude/frontend/tanstack-query.md for patterns
 */
export function useAuth() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  // Current user query
  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.user,
    queryFn: authService.me,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      message.success(t("auth.loginSuccess"));
      router.push("/dashboard");
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      message.success(t("auth.registerSuccess"));
      router.push("/dashboard");
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      message.success(t("auth.logoutSuccess"));
      router.push("/login");
    },
  });

  // Helper: Handle form submit with validation errors
  const handleSubmit = async <T>(
    form: FormInstance,
    mutation: { mutateAsync: (data: T) => Promise<void> },
    values: T
  ) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      const formErrors = getFormErrors(error);
      if (formErrors.length > 0) {
        form.setFields(formErrors);
      }
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,

    login: (data: LoginInput) => loginMutation.mutateAsync(data),
    register: (data: RegisterInput) => registerMutation.mutateAsync(data),
    logout: () => logoutMutation.mutateAsync(),
    refetch,

    // For form handling
    loginMutation,
    registerMutation,
    logoutMutation,
    handleSubmit,
  };
}
