/**
 * Users Service
 *
 * CRUD operations for User resource.
 * Maps to Laravel UserController.
 */

import api, { PaginatedResponse } from "@/lib/api";
import type { User, UserCreate, UserUpdate } from "@/types/model";

// =============================================================================
// Types - Only query params (Create/Update come from Omnify)
// =============================================================================

/** Query params for listing users */
export interface UserListParams {
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: keyof User;
  sort_order?: "asc" | "desc";
}

// =============================================================================
// Service
// =============================================================================

const BASE_URL = "/api/users";

export const userService = {
  /**
   * Get paginated list of users
   * GET /api/users
   */
  list: async (params?: UserListParams): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get(BASE_URL, { params });
    return data;
  },

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  get: async (id: number): Promise<User> => {
    const { data } = await api.get(`${BASE_URL}/${id}`);
    return data.data ?? data;
  },

  /**
   * Create new user
   * POST /api/users
   */
  create: async (input: UserCreate): Promise<User> => {
    const { data } = await api.post(BASE_URL, input);
    return data.data ?? data;
  },

  /**
   * Update existing user
   * PUT /api/users/:id
   */
  update: async (id: number, input: UserUpdate): Promise<User> => {
    const { data } = await api.put(`${BASE_URL}/${id}`, input);
    return data.data ?? data;
  },

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/${id}`);
  },
};
