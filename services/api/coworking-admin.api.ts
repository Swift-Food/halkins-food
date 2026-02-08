/**
 * Coworking Admin API Service
 *
 * Provides API methods for managing coworking spaces in the admin panel.
 * All endpoints require ADMIN role authentication.
 *
 * Backend: src/features/coworking/controllers/coworking-admin.controller.ts
 */

import { fetchWithAuth } from '@/lib/api-client/auth-client';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import {
  ListCoworkingSpacesQuery,
  ListSpacesResponse,
  CoworkingSpaceAdmin,
  CreateCoworkingSpaceRequest,
  UpdateCoworkingSpaceRequest,
  GetCredentialsResponse,
  UpsertCredentialsRequest,
  UpsertCredentialsResponse,
  ListSpaceUsersResponse,
  AddSpaceUserRequest,
  AddSpaceUserResponse,
  UpdateSpaceUserRequest,
  UpdateSpaceUserResponse,
} from '@/types/api';

class CoworkingAdminService {
  // ============================================================
  // SPACE CRUD
  // ============================================================

  /**
   * List all coworking spaces with optional filtering
   */
  async listSpaces(query?: ListCoworkingSpacesQuery): Promise<ListSpacesResponse> {
    const params = new URLSearchParams();

    if (query?.search) {
      params.append('search', query.search);
    }
    if (query?.isActive !== undefined) {
      params.append('isActive', String(query.isActive));
    }
    if (query?.skip !== undefined) {
      params.append('skip', String(query.skip));
    }
    if (query?.take !== undefined) {
      params.append('take', String(query.take));
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING}${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have permission to access this resource');
      }
      throw new Error('Failed to fetch coworking spaces');
    }

    return response.json();
  }

  /**
   * Get a single coworking space with credential status
   */
  async getSpace(id: string): Promise<CoworkingSpaceAdmin> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_SPACE(id)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch coworking space');
    }

    return response.json();
  }

  /**
   * Create a new coworking space
   */
  async createSpace(data: CreateCoworkingSpaceRequest): Promise<CoworkingSpaceAdmin> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Invalid space data');
      }
      if (response.status === 409) {
        throw new Error('A space with this slug already exists');
      }
      throw new Error('Failed to create coworking space');
    }

    return response.json();
  }

  /**
   * Update a coworking space
   */
  async updateSpace(
    id: string,
    data: UpdateCoworkingSpaceRequest
  ): Promise<CoworkingSpaceAdmin> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_SPACE(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Invalid space data');
      }
      throw new Error('Failed to update coworking space');
    }

    return response.json();
  }

  /**
   * Soft delete a coworking space
   */
  async deleteSpace(id: string): Promise<void> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_SPACE(id)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to delete coworking space');
    }
  }

  /**
   * Restore a soft-deleted space
   */
  async restoreSpace(id: string): Promise<CoworkingSpaceAdmin> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_RESTORE(id)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to restore coworking space');
    }

    return response.json();
  }

  // ============================================================
  // CREDENTIALS MANAGEMENT
  // ============================================================

  /**
   * Get credentials status for a space (org slug only, not secrets)
   */
  async getCredentials(spaceId: string): Promise<GetCredentialsResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_CREDENTIALS(spaceId)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch credentials');
    }

    return response.json();
  }

  /**
   * Create or update OfficeRnD credentials for a space
   */
  async upsertCredentials(
    spaceId: string,
    data: UpsertCredentialsRequest
  ): Promise<UpsertCredentialsResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_CREDENTIALS(spaceId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Invalid credentials');
      }
      throw new Error('Failed to save credentials');
    }

    return response.json();
  }

  /**
   * Delete OfficeRnD credentials for a space
   */
  async deleteCredentials(spaceId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_CREDENTIALS(spaceId)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to delete credentials');
    }
  }

  // ============================================================
  // SPACE USER MANAGEMENT
  // ============================================================

  /**
   * List users for a coworking space
   */
  async listSpaceUsers(spaceId: string): Promise<ListSpaceUsersResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_USERS(spaceId)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space not found');
      }
      throw new Error('Failed to fetch space users');
    }

    return response.json();
  }

  /**
   * Add a user to a coworking space
   */
  async addSpaceUser(
    spaceId: string,
    data: AddSpaceUserRequest
  ): Promise<AddSpaceUserResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_USERS(spaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coworking space or user not found');
      }
      if (response.status === 409) {
        throw new Error('User is already added to this space');
      }
      throw new Error('Failed to add user');
    }

    return response.json();
  }

  /**
   * Update a space user's role
   */
  async updateSpaceUser(
    spaceId: string,
    userId: string,
    data: UpdateSpaceUserRequest
  ): Promise<UpdateSpaceUserResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_USER(spaceId, userId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Space user not found');
      }
      throw new Error('Failed to update user role');
    }

    return response.json();
  }

  /**
   * Remove a user from a coworking space
   */
  async removeSpaceUser(spaceId: string, userId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.ADMIN_COWORKING_USER(spaceId, userId)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Space user not found');
      }
      throw new Error('Failed to remove user');
    }
  }
}

// Export singleton instance
export const coworkingAdminService = new CoworkingAdminService();
