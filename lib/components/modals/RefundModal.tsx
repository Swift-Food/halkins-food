// components/catering/dashboard/RefundModal.tsx
'use client';

import { useState } from 'react';

import { X, Upload, Loader2 } from 'lucide-react';
import { refundService } from '@/services/api/refund.api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderType: 'catering' | 'corporate';
  totalAmount: number;
  orderItems: any;
  onSuccess: () => void;
  userId: string;
}

interface SelectedItem {
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export function RefundModal({
  isOpen,
  onClose,
  orderId,
  orderType,
  orderItems,
  onSuccess,
  userId
}: RefundModalProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [images, ] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Parse the nested order items structure
  const parseOrderItems = () => {
    const restaurants: any[] = [];
    
    // orderItems is an array of restaurant orders
    if (Array.isArray(orderItems)) {
      orderItems.forEach((restaurantOrder: any) => {
        if (restaurantOrder.menuItems && restaurantOrder.menuItems.length > 0) {
          restaurants.push({
            restaurantId: restaurantOrder.restaurantId,
            restaurantName: restaurantOrder.restaurantName,
            menuItems: restaurantOrder.menuItems,
          });
        }
      });
    }
    
    return restaurants;
  };

  const restaurants = parseOrderItems();

  const handleItemToggle = (restaurant: any, menuItem: any) => {
    const existingIndex = selectedItems.findIndex(
      (si) => si.restaurantId === restaurant.restaurantId && si.menuItemId === menuItem.menuItemId
    );

    if (existingIndex > -1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== existingIndex));
    } else {
      // Use new clear pricing fields if available, otherwise fall back to legacy
      const unitPrice = Number(menuItem.customerUnitPrice ?? menuItem.unitPrice) || 0;
      const totalPrice = Number(menuItem.customerTotalPrice ?? menuItem.totalPrice) || (unitPrice * Number(menuItem.quantity)) || 0;

      setSelectedItems([
        ...selectedItems,
        {
          restaurantId: restaurant.restaurantId,
          restaurantName: restaurant.restaurantName,
          menuItemId: menuItem.menuItemId,
          itemName: menuItem.menuItemName,
          unitPrice: unitPrice,
          quantity: Number(menuItem.quantity) || 0,
          totalPrice: totalPrice,
        },
      ]);
    }
  };

  const calculateRefundAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getSelectedRestaurants = () => {
    const restaurantMap = new Map<string, { id: string; name: string; items: SelectedItem[] }>();
    
    selectedItems.forEach(item => {
      if (!restaurantMap.has(item.restaurantId)) {
        restaurantMap.set(item.restaurantId, {
          id: item.restaurantId,
          name: item.restaurantName,
          items: [],
        });
      }
      restaurantMap.get(item.restaurantId)!.items.push(item);
    });
    
    return Array.from(restaurantMap.values());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item to refund');
      return;
    }

    if (!reason) {
      setError('Please select a reason for the refund');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const restaurantsWithItems = getSelectedRestaurants();
      
      // Create refund request for each restaurant
      for (const restaurant of restaurantsWithItems) {
        const restaurantAmount = restaurant.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const itemsList = restaurant.items.map(i => `${i.itemName} x${i.quantity} (£${i.totalPrice.toFixed(2)})`).join(', ');

        await refundService.createRefundRequest({
          orderType,
          orderId,
          restaurantId: restaurant.id,
          reason,
          additionalDetails: `Items: ${itemsList}${additionalDetails ? '. Additional details: ' + additionalDetails : ''}`,
          images: images.length > 0 ? images : undefined,
          requestedAmount: restaurantAmount,
          refundItems: restaurant.items.map(item => ({ // Add this
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        userId
      );
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const refundAmount = calculateRefundAmount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Request Refund</h2>
            <p className="text-sm text-gray-600 mt-1">Select items you'd like to refund</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Order Items Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Items to Refund *
            </label>
            <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {restaurants.map((restaurant: any, restIdx: number) => (
                <div key={`${restaurant.restaurantId}-${restIdx}`} className="space-y-2">
                  <div className="sticky top-0 bg-white z-10 pb-2">
                    <h4 className="font-semibold text-gray-900 text-sm border-b-2 border-pink-200 pb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                      {restaurant.restaurantName}
                    </h4>
                  </div>
                  {restaurant.menuItems.map((menuItem: any, itemIdx: number) => {
                    const isSelected = selectedItems.some(
                      si => si.restaurantId === restaurant.restaurantId && si.menuItemId === menuItem.menuItemId
                    );
                    return (
                      <label
                        key={`${menuItem.menuItemId}-${itemIdx}`}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-pink-50 border-2 border-pink-500 shadow-sm' 
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleItemToggle(restaurant, menuItem)}
                          className="w-4 h-4 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{menuItem.menuItemName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">Qty: {menuItem.quantity}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600">
                              £{Number(menuItem.customerUnitPrice ?? menuItem.unitPrice).toFixed(2)} each
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            £{Number(menuItem.customerTotalPrice ?? menuItem.totalPrice).toFixed(2)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ))}
              
              {restaurants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No items available for refund</p>
                </div>
              )}
            </div>
            
            {selectedItems.length > 0 && (
              <div className="mt-3 p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg border border-pink-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-pink-900">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                    </span>
                    <p className="text-xs text-pink-700 mt-1">
                      from {getSelectedRestaurants().length} restaurant{getSelectedRestaurants().length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-pink-900">
                    £{refundAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Refund *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              required
            >
              <option value="">Select a reason</option>
              <option value="food_quality">Food Quality Issue</option>
              <option value="incorrect_order">Incorrect Order</option>
              <option value="late_delivery">Late Delivery</option>
              <option value="missing_items">Missing Items</option>
              <option value="food_safety">Food Safety Concern</option>
              <option value="damaged_items">Damaged Items</option>
              <option value="wrong_temperature">Wrong Temperature</option>
              <option value="portion_size">Portion Size Issue</option>
              <option value="taste_issue">Taste/Preparation Issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details
            </label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={4}
              placeholder="Please provide more details about your refund request..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-400 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Upload images to support your refund request
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG up to 5MB each
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Refund
                  {refundAmount > 0 && (
                    <span className="ml-1 font-bold">
                      £{refundAmount.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}