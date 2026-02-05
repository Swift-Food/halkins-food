// app/components/catering/dashboard/PickupContactManager.tsx
'use client';

import React, { useState } from 'react';
import { UpdatePickupContactDto } from '@/types/catering.types';
import { CateringOrderResponse } from '@/types/api';
import { cateringService } from '@/services/api/catering.api';
import { User, Mail, Phone, Edit2 } from 'lucide-react';

interface PickupContactManagerProps {
  order: CateringOrderResponse;
  onUpdate: () => void;
  accessToken: string;
}

export default function PickupContactManager({ order, onUpdate, accessToken }: PickupContactManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: order.pickupContactName || '',
    phone: order.pickupContactPhone || '',
    email: order.pickupContactEmail || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPickupContact = order.pickupContactName && order.pickupContactPhone && order.pickupContactEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const dto: UpdatePickupContactDto = {
        orderId: order.id,
        pickupContactName: formData.name,
        pickupContactPhone: formData.phone,
        pickupContactEmail: formData.email,
        accessToken,
      };

      await cateringService.updatePickupContact(dto);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update pickup contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
          Pickup Contact
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs sm:text-sm text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
            {hasPickupContact ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm sm:text-base"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm sm:text-base"
              placeholder="+44 7700 900000"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm sm:text-base"
              placeholder="john@example.com"
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
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: order.pickupContactName || '',
                  phone: order.pickupContactPhone || '',
                  email: order.pickupContactEmail || '',
                });
                setError(null);
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 text-xs sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : hasPickupContact ? (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Name</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-words">{order.pickupContactName}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-3">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Phone</p>
              <p className="font-medium text-sm sm:text-base text-gray-900">{order.pickupContactPhone}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-3">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600">Email</p>
              <p className="font-medium text-sm sm:text-base text-gray-900 break-all">{order.pickupContactEmail}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 sm:py-6">
          <User className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">No pickup contact assigned yet</p>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-pink-500 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-pink-600 text-xs sm:text-sm"
          >
            Add Pickup Contact
          </button>
        </div>
      )}
    </div>
  );
}