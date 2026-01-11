/**
 * User Schemas - Clean & Simple
 * Messages được handle bởi global zod-i18n
 */

import { z } from "zod";

// =============================================================================
// Field Schemas (không cần message - global error map xử lý)
// =============================================================================

export const userSchemas = {
    name_lastname: z.string().min(1).max(255),
    name_firstname: z.string().min(1).max(255),
    name_kana_lastname: z.string().min(1).max(255),
    name_kana_firstname: z.string().min(1).max(255),
    email: z.email(),
    password: z.string().min(8),
};

// =============================================================================
// Form Schemas
// =============================================================================

export const userCreateSchema = z.object({
    name_lastname: userSchemas.name_lastname,
    name_firstname: userSchemas.name_firstname,
    name_kana_lastname: userSchemas.name_kana_lastname,
    name_kana_firstname: userSchemas.name_kana_firstname,
    email: userSchemas.email,
    password: userSchemas.password,
});

export const userUpdateSchema = z.object({
    name_lastname: userSchemas.name_lastname,
    name_firstname: userSchemas.name_firstname,
    name_kana_lastname: userSchemas.name_kana_lastname,
    name_kana_firstname: userSchemas.name_kana_firstname,
    email: userSchemas.email,
});

// =============================================================================
// Types
// =============================================================================

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
