// app/components/catering/dashboard/OrderStatusBadge.tsx
import React from 'react';
import { CateringOrderStatus } from '@/types/catering.types';
import { CateringOrderStatus as ApiCateringOrderStatus } from '@/types/api';
import { CheckCircle, Clock, Package, XCircle, Eye, CreditCard } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: CateringOrderStatus | ApiCateringOrderStatus;
}

const statusConfig = {
  [CateringOrderStatus.PENDING_REVIEW]: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    description: 'Your order is being reviewed by our team',
  },
  [CateringOrderStatus.ADMIN_REVIEWED]: {
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Eye,
    description: 'Waiting for restaurant confirmation',
  },
  [CateringOrderStatus.RESTAURANT_REVIEWED]: {
    label: 'Approved',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: CheckCircle,
    description: 'Restaurants have confirmed availability',
  },
  [CateringOrderStatus.PAYMENT_LINK_SENT]: {
    label: 'Payment Pending',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: CreditCard,
    description: 'Payment link has been sent to your email',
  },
  [CateringOrderStatus.PAID]: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    description: 'Payment received successfully',
  },
  [CateringOrderStatus.CONFIRMED]: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    description: 'Your event order is confirmed',
  },
  [CateringOrderStatus.COMPLETED]: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: Package,
    description: 'Event has been completed',
  },
  [CateringOrderStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
    description: 'This order has been cancelled',
  },
};

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col items-start sm:items-end gap-1 sm:gap-2">
      <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 font-semibold text-xs sm:text-sm ${config.color}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        <span className="whitespace-nowrap">{config.label}</span>
      </div>
      <p className="text-xs sm:text-sm text-white/90 italic hidden sm:block">{config.description}</p>
      <p className="text-xs text-white/90 italic sm:hidden">{config.description}</p>
    </div>
  );
}