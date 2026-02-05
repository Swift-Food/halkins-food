// components/catering/dashboard/RefundsList.tsx - Create new component

'use client';

import { RefundRequest, RefundStatus } from '@/types/refund.types';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RefundsListProps {
  refunds: RefundRequest[];
}

export default function RefundsList({ refunds }: RefundsListProps) {
  if (refunds.length === 0) return null;

  const getStatusBadge = (status: RefundStatus) => {
    const config = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' },
      processed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'Processed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, label: 'Cancelled' },
    };

    const { bg, text, icon: Icon, label } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-pink-600" />
        <h3 className="text-lg font-bold text-gray-900">Refund Requests</h3>
      </div>

      <div className="space-y-3">
        {refunds.map((refund) => (
          <div
            key={refund.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {refund.restaurantName || 'Restaurant'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requested: {formatDate(refund.createdAt)}
                </p>
              </div>
              {getStatusBadge(refund.status)}
            </div>

            {refund.refundItems && refund.refundItems.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Items:</p>
                <ul className="space-y-1">
                  {refund.refundItems.map((item, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex justify-between">
                      <span>{item.itemName} x{item.quantity}</span>
                      <span className="font-medium">£{(item.customerTotalPrice ?? item.totalPrice).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-600">
                Reason: <span className="font-medium">{refund.reason.replace('_', ' ')}</span>
              </span>
              <span className="text-sm font-bold text-gray-900">
                £{Number(refund.requestedAmount).toFixed(2)}
              </span>
            </div>

            {refund.restaurantResponse && (
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                <p className="font-medium text-blue-900 mb-1">Restaurant Response:</p>
                <p className="text-blue-800">{refund.restaurantResponse}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}