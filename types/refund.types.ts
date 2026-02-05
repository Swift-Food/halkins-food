// types/catering.types.ts - Add these types

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
  CANCELLED = 'cancelled',
}

export interface RefundRequest {
  id: string;
  orderType: 'catering' | 'corporate';
  restaurantId: string;
  reason: string;
  additionalDetails?: string;
  images?: string[];
  requestedAmount: number;
  approvedAmount?: number;
  status: RefundStatus;
  userEmail?: string;
  userName?: string;
  cateringOrderId?: string;
  corporateOrderId?: string;
  restaurantResponse?: string;
  createdAt: string;
  updatedAt: string;
  refundRequestDeadline: string;
  restaurantName?: string
  refundItems?: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number; // Legacy field
    totalPrice: number; // Legacy field
    // NEW: Clear pricing fields (optional, for future migration)
    customerUnitPrice?: number;
    customerTotalPrice?: number;
  }[];
}