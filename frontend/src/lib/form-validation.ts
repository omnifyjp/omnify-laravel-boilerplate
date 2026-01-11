/**
 * Zod + Ant Design Form Validation with i18n
 */

import { z } from "zod";
import type { Rule } from "antd/es/form";
import { getZodMessage } from "./zod-i18n";

/**
 * Convert Zod schema to Ant Design Rule with i18n support
 */
export function zodRule<T>(schema: z.ZodType<T>, field = ""): Rule {
    return {
        validator: async (_, value) => {
            // Empty check
            if (value === undefined || value === null || value === "") {
                if (schema.safeParse(undefined).success) return;
                throw new Error(getZodMessage("required", { field }));
            }

            const result = schema.safeParse(value);
            if (result.success) return;

            // Parse Zod error and translate
            const issue = result.error.issues[0];
            if (!issue) throw new Error(getZodMessage("required", { field }));

            // Translate based on error type
            switch (issue.code) {
                case "too_small":
                    throw new Error(getZodMessage("minLength", { field, min: (issue as { minimum?: number }).minimum }));
                case "too_big":
                    throw new Error(getZodMessage("maxLength", { field, max: (issue as { maximum?: number }).maximum }));
                case "invalid_format":
                    if ((issue as { format?: string }).format === "email") {
                        throw new Error(getZodMessage("email"));
                    }
                    break;
            }

            // Fallback to Zod's message
            throw new Error(issue.message);
        },
    };
}
