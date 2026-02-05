// app/components/catering/dashboard/DeliveryInfo.tsx
import React from 'react';
import { CateringOrderResponse } from '@/types/api';
import { User, Mail, Phone, Clock, Building, FileText } from 'lucide-react';

interface DeliveryInfoProps {
  order: CateringOrderResponse;
}

export default function DeliveryInfo({ order }: DeliveryInfoProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Contact Information</h3>
      
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-gray-600">Customer</p>
            <p className="font-medium text-sm sm:text-base text-gray-900 break-words">{order.customerName}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 sm:gap-3">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-gray-600">Email</p>
            <p className="font-medium text-sm sm:text-base text-gray-900 break-all">{order.customerEmail}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 sm:gap-3">
          <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-gray-600">Phone</p>
            <p className="font-medium text-sm sm:text-base text-gray-900">{order.customerPhone}</p>
          </div>
        </div>

        {order.organization && (
          <div className="flex items-start gap-2 sm:gap-3">
            <Building className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Organization</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-words">{order.organization}</p>
            </div>
          </div>
        )}

        {order.billingAddress?.line1 && (
          <div className="flex items-start gap-2 sm:gap-3">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Billing Address</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-words">
                {order.billingAddress.line1}
                {order.billingAddress.line2 && <>, {order.billingAddress.line2}</>}
                <br />
                {order.billingAddress.city}, {order.billingAddress.postalCode}
                <br />
                {order.billingAddress.country === 'GB' ? 'United Kingdom' : order.billingAddress.country === 'IE' ? 'Ireland' : order.billingAddress.country}
              </p>
            </div>
          </div>
        )}

        <div className="pt-3 sm:pt-4 border-t border-gray-200">
          <div className="flex items-start gap-2 sm:gap-3">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Order Placed</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">
                {new Date(order.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}