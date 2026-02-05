// components/catering/dashboard/RefundRequestButton.tsx
'use client';

import { useState } from 'react';
import { RefundModal } from '../../modals/RefundModal';
import { RotateCcw } from 'lucide-react';

interface RefundRequestButtonProps {
  orderId: string;
  orderType: 'catering' | 'corporate';
  orderCompletedAt: string;
  totalAmount: number;
  canRequestRefund: boolean;
  onRefundRequested: () => void;
  orderItems: any[];
  userId: string;
}

export default function RefundRequestButton({
  orderId,
  orderType,
  orderCompletedAt,
  totalAmount,
  orderItems,
  canRequestRefund,
  onRefundRequested,
  userId,
}: RefundRequestButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const completedDate = new Date(orderCompletedAt);
  const deadline = new Date(completedDate.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const isWithinWindow = now <= deadline;

  if (!canRequestRefund || !isWithinWindow) {
    return null;
  }



  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
      >
        <RotateCcw className="h-5 w-5" />
        Request Refund
      </button>
      
     

      <RefundModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        orderId={orderId}
        orderType={orderType}
        totalAmount={totalAmount}
        orderItems={orderItems}
        onSuccess={() => {
          setShowModal(false);
          onRefundRequested();
        }}
        userId={userId}
      />
    </>
  );
}