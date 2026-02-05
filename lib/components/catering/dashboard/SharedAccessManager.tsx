// app/components/catering/dashboard/SharedAccessManager.tsx
'use client';

import React, { useState } from 'react';
import { AddSharedAccessDto, RemoveSharedAccessDto, SharedAccessRole, UpdateSharedAccessRoleDto } from '@/types/catering.types';
import { CateringOrderResponse } from '@/types/api';
import { cateringService } from '@/services/api/catering.api';
import { Users, Trash2, Plus, X, Eye, Shield, Edit } from 'lucide-react';

interface SharedAccessManagerProps {
  order: CateringOrderResponse;
  onUpdate: () => void;
  currentUserRole: 'viewer' | 'editor' | 'manager' | null;
}

export default function SharedAccessManager({ order, onUpdate, currentUserRole }: SharedAccessManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: SharedAccessRole.VIEWER as SharedAccessRole
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const sharedUsers = order.sharedAccessUsers || [];
  const isManager = currentUserRole === 'editor';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const dto: AddSharedAccessDto = {
        orderId: order.id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      await cateringService.addSharedAccess(dto);
      setIsAdding(false);
      setFormData({ name: '', email: '', role: SharedAccessRole.VIEWER });
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to add shared access');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!confirm(`Remove access for ${email}?`)) return;

    try {
      const dto: RemoveSharedAccessDto = {
        orderId: order.id,
        email,
      };

      await cateringService.removeSharedAccess(dto);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to remove shared access');
    }
  };

  const handleRoleChange = async (email: string, newRole: SharedAccessRole) => {
    try {
      const dto: UpdateSharedAccessRoleDto = {
        orderId: order.id,
        email,
        newRole,
      };

      await cateringService.updateSharedAccessRole(dto);
      setEditingUser(null);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
          Shared Access
        </h3>
        {!isAdding && isManager && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs sm:text-sm text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            Add User
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2 sm:space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm"
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Access Level
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as SharedAccessRole })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm"
            >
              <option value={SharedAccessRole.VIEWER}>Viewer (View Only)</option>
              <option value={SharedAccessRole.MANAGER}>Manager (Can Edit)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.role === SharedAccessRole.MANAGER 
                ? 'Managers can update pickup contact, change delivery time, and share access'
                : 'Viewers can only see order details'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pink-500 text-white py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({ name: '', email: '', role: SharedAccessRole.VIEWER });
                setError(null);
              }}
              className="px-3 sm:px-4 bg-gray-200 text-gray-700 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-gray-300"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </form>
      )}

      {sharedUsers.length > 0 ? (
        <div className="space-y-2">
          {sharedUsers.map((user, idx) => (
            <div
              key={idx}
              className="flex items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{user.name}</p>
                  {editingUser === user.email ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.email, e.target.value as SharedAccessRole)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 w-full sm:w-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value={SharedAccessRole.VIEWER}>Viewer</option>
                      <option value={SharedAccessRole.MANAGER}>Manager</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold w-fit ${
                        user.role === 'editor'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role === 'editor' ? (
                        <>
                          <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          Manager
                        </>
                      ) : (
                        <>
                          <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          Viewer
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {isManager && editingUser !== user.email && (
                  <button
                    onClick={() => setEditingUser(user.email)}
                    className="text-blue-600 hover:text-blue-700 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50"
                    title="Change role"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                )}
                {isManager && (
                  <button
                    onClick={() => handleRemove(user.email)}
                    className="text-red-600 hover:text-red-700 p-1.5 sm:p-2 rounded-lg hover:bg-red-50"
                    title="Remove access"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 sm:py-6">
          <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-gray-500 text-xs sm:text-sm">No shared users yet</p>
        </div>
      )}

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="space-y-1.5 sm:space-y-2 text-xs text-gray-600">
          <p className="flex items-start gap-2">
            <Shield className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong className="text-green-700">Managers</strong> can view, update contacts, change time, and share access</span>
          </p>
          <p className="flex items-start gap-2">
            <Eye className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong className="text-blue-700">Viewers</strong> can only view order details</span>
          </p>
        </div>
      </div>
    </div>
  );
}