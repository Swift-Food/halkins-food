/**
 * API TYPE DEFINITIONS - Coworking Admin DTOs
 *
 * These types MUST match the backend DTOs exactly:
 * Backend: src/features/coworking/dto/coworking-admin.dto.ts
 * Backend: src/features/coworking/controllers/coworking-admin.controller.ts
 *
 * IMPORTANT: Do not modify these types without updating the corresponding backend DTOs
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Query params for listing coworking spaces
 * Backend: ListCoworkingSpacesDto
 */
export interface ListCoworkingSpacesQuery {
  search?: string;
  isActive?: boolean;
  skip?: number; // default 0
  take?: number; // default 20, max 100
}

/**
 * Create a new coworking space
 * Backend: CreateCoworkingSpaceDto
 */
export interface CreateCoworkingSpaceRequest {
  name: string; // 1-255 chars
  slug: string; // 1-100 chars, lowercase + numbers + hyphens only
  address: string;
  contactEmail: string;
  deliveryInstructions?: string;
  timezone?: string; // 1-50 chars
  minLeadTimeHours?: number; // min 0
  minOrderValue?: number; // min 0
  operatingHoursStart?: string; // HH:MM format
  operatingHoursEnd?: string; // HH:MM format
  isActive?: boolean; // default true
}

/**
 * Update an existing coworking space
 * Backend: UpdateCoworkingSpaceDto
 */
export interface UpdateCoworkingSpaceRequest {
  name?: string;
  slug?: string;
  address?: string;
  contactEmail?: string;
  deliveryInstructions?: string;
  timezone?: string;
  minLeadTimeHours?: number;
  minOrderValue?: number;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  isActive?: boolean;
  stripeAccountId?: string;
}

/**
 * Create/update OfficeRnD credentials
 * Backend: UpsertCoworkingCredentialsDto
 */
export interface UpsertCredentialsRequest {
  clientId: string;
  clientSecret: string;
  organizationSlug: string;
}

/**
 * Add a user to a coworking space
 * Backend: AddCoworkingSpaceUserDto
 */
export interface AddSpaceUserRequest {
  userId: string; // UUID
  role?: 'admin' | 'viewer'; // default 'admin'
}

/**
 * Update a space user's role
 */
export interface UpdateSpaceUserRequest {
  role: 'admin' | 'viewer';
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Coworking space entity (admin view)
 */
export interface CoworkingSpaceAdmin {
  id: string;
  name: string;
  slug: string;
  address: string;
  contactEmail: string;
  deliveryInstructions: string | null;
  timezone: string | null;
  minLeadTimeHours: number;
  minOrderValue: number;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
  isActive: boolean;
  stripeAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Extended fields from getSpace
  hasCredentials?: boolean;
  credentialOrgSlug?: string;
}

/**
 * Response for GET /admin/coworking (list)
 */
export interface ListSpacesResponse {
  spaces: CoworkingSpaceAdmin[];
  total: number;
  skip: number;
  take: number;
}

/**
 * Response for GET /admin/coworking/:id/credentials
 */
export interface GetCredentialsResponse {
  hasCredentials: boolean;
  organizationSlug?: string;
  isActive?: boolean;
  activeFrom?: string; // ISO datetime
  createdAt?: string; // ISO datetime
}

/**
 * Response for PUT /admin/coworking/:id/credentials
 */
export interface UpsertCredentialsResponse {
  success: true;
  organizationSlug: string;
  isActive: boolean;
  activeFrom: string; // ISO datetime
}

/**
 * Space user info
 */
export interface SpaceUser {
  id: string;
  userId: string;
  email?: string;
  role: 'admin' | 'viewer';
  createdAt: string; // ISO datetime
}

/**
 * Response for GET /admin/coworking/:id/users
 */
export interface ListSpaceUsersResponse {
  users: SpaceUser[];
}

/**
 * Response for POST /admin/coworking/:id/users
 */
export interface AddSpaceUserResponse {
  id: string;
  userId: string;
  role: 'admin' | 'viewer';
  createdAt: string; // ISO datetime
}

/**
 * Response for PATCH /admin/coworking/:id/users/:userId
 */
export interface UpdateSpaceUserResponse {
  id: string;
  userId: string;
  role: 'admin' | 'viewer';
}

// ============================================================================
// WEBHOOK TYPES (for admin display, not invocation)
// ============================================================================

/**
 * OfficeRnD webhook event types
 */
export type WebhookEventType =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.removed';

/**
 * Webhook event record (for admin viewing)
 */
export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventType: WebhookEventType;
  processedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}
