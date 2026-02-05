// app/components/catering/dashboard/OrderDetails.tsx
import React, { useMemo } from 'react';
import { CateringOrderResponse } from '@/types/api';
import { MapPin, FileText, Calendar } from 'lucide-react';
import { formatDeliveryAddress } from '@/app/restaurant/dashboard/catering/utils/address.utils';

interface OrderDetailsProps {
  order: CateringOrderResponse;
}

// Helper to format time from 24h to 12h format
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export default function OrderDetails({ order }: OrderDetailsProps) {
  // Calculate event date range from meal sessions
  const eventDateInfo = useMemo(() => {
    const formatDate = (date: string | Date) => {
      return new Date(date).toLocaleDateString('en-GB', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    // If no meal sessions, fall back to order.eventDate
    if (!order.mealSessions || order.mealSessions.length === 0) {
      return {
        isSingleDate: true,
        startDate: formatDate(order.eventDate),
        startTime: formatTime(order.eventTime),
        endDate: null,
        endTime: null,
      };
    }

    // Sort sessions by date and time
    const sortedSessions = [...order.mealSessions].sort((a, b) => {
      const dateA = new Date(a.sessionDate).getTime();
      const dateB = new Date(b.sessionDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.eventTime.localeCompare(b.eventTime);
    });

    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];

    // Check if all on same date
    const firstDateStr = new Date(firstSession.sessionDate).toDateString();
    const lastDateStr = new Date(lastSession.sessionDate).toDateString();
    const isSingleDate = firstDateStr === lastDateStr;

    return {
      isSingleDate,
      startDate: formatDate(firstSession.sessionDate),
      startTime: formatTime(firstSession.eventTime),
      endDate: isSingleDate ? null : formatDate(lastSession.sessionDate),
      endTime: isSingleDate ? null : formatTime(lastSession.eventTime),
    };
  }, [order.mealSessions, order.eventDate, order.eventTime]);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Event Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Event Date */}
        <div className="flex items-start gap-2 sm:gap-3">
          {eventDateInfo.isSingleDate ? (
            <>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600">Event Date</p>
                <p className="font-semibold text-sm sm:text-base text-gray-900">{eventDateInfo.startDate}</p>
              </div>
            </>
          ) : (
            <div className="flex gap-3 sm:gap-4">
              {/* Timeline dots and line */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                <div className="w-0.5 flex-1 bg-primary my-1" />
                <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
              </div>
              {/* Date content */}
              <div className="flex flex-col justify-between min-w-0">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Start</p>
                  <p className="font-semibold text-sm sm:text-base text-gray-900">{eventDateInfo.startDate}</p>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">End</p>
                  <p className="font-semibold text-sm sm:text-base text-gray-900">{eventDateInfo.endDate}</p>
                </div>
              </div>
            </div>
          )}
        </div>



        <div className="flex items-start gap-2 sm:gap-3 sm:col-span-2">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500 mt-1 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-gray-600">Delivery Address</p>
            <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">{formatDeliveryAddress(order.deliveryAddress)}</p>
          </div>
        </div>

        {order.specialInstructions && (
          <div className="sm:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-2">📋 Special Requirements</p>
            <p className="text-xs sm:text-sm text-yellow-800 whitespace-pre-wrap break-words">{order.specialInstructions}</p>
          </div>
        )}

        {order.publicNote && (
          <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">💬 Note from Swift Food</p>
            <p className="text-xs sm:text-sm text-blue-800 whitespace-pre-wrap break-words">{order.publicNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}