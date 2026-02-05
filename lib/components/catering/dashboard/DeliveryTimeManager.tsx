// app/components/catering/dashboard/DeliveryTimeManager.tsx
'use client';

import React, { useState } from 'react';
import { UpdateDeliveryTimeDto } from '@/types/catering.types';
import { CateringOrderResponse } from '@/types/api';
import { cateringService } from '@/services/api/catering.api';
import { Clock, AlertCircle } from 'lucide-react';

interface DeliveryTimeManagerProps {
  order: CateringOrderResponse;
  onUpdate: () => void;
  accessToken: string;
}

export default function DeliveryTimeManager({ order, onUpdate, accessToken }: DeliveryTimeManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTime, setNewTime] = useState(order.eventTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHoursUntilEvent = () => {
    const eventDateTime = new Date(order.eventDate);
    const [hours, minutes] = order.eventTime.split(':');
    eventDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const now = new Date();
    return (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  };

  const hoursUntilEvent = getHoursUntilEvent();
  const canChangeTime = hoursUntilEvent >= 48;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newTime === order.eventTime) {
      setIsEditing(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dto: UpdateDeliveryTimeDto = {
        orderId: order.id,
        newEventTime: newTime,
        accessToken,
      };

      await cateringService.updateDeliveryTime(dto);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update delivery time');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
          Delivery Time
        </h3>
        {canChangeTime && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs sm:text-sm text-pink-600 hover:text-pink-700 font-semibold"
          >
            Change Time
          </button>
        )}
      </div>

      {!canChangeTime && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-yellow-800">
              {hoursUntilEvent < 48 ? (
                <p>Delivery time cannot be changed within 48 hours of the event.</p>
              ) : (
                <p>Delivery time can only be changed for paid or confirmed orders.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              New Event Time
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm sm:text-base"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pink-500 text-white py-2 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {loading ? 'Updating...' : 'Update Time'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setNewTime(order.eventTime);
                setError(null);
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 text-xs sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{order.eventTime}</p>
          {order.collectionTime && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Collection: {order.collectionTime}
            </p>
          )}
          {order.deliveryTimeChangedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Last changed: {new Date(order.deliveryTimeChangedAt).toLocaleString('en-GB')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}