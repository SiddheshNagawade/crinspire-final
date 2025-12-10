import React, { useState, useEffect } from 'react';
import { X, Zap, Check } from 'lucide-react';
import {
  loadRazorpayScript,
  initiatePayment,
  openRazorpayCheckout,
  verifyPayment,
  updateUserSubscription,
} from '../utils/paymentUtils';
import { SUBSCRIPTION_PLANS } from '../config/razorpay';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string;
  fullName: string;
  onPaymentSuccess: (subscriptionEnd: Date) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  userId,
  email,
  fullName,
  onPaymentSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof SUBSCRIPTION_PLANS>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript().catch(() => setError('Failed to load Razorpay'));
    }
  }, [isOpen]);

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Initiate payment order
      const { orderId, amount, plan } = await initiatePayment(
        selectedPlan,
        userId,
        email,
        fullName
      );

      // Step 2: Open Razorpay checkout
      openRazorpayCheckout(
        orderId,
        amount,
        email,
        fullName,
        async (paymentId: string, orderId: string, signature?: string) => {
          try {
            // Step 3: Verify payment on backend (pass signature)
            const verifyResult = await verifyPayment(
              paymentId,
              orderId,
              signature || '',
              userId
            );

            // Step 4: Update user subscription in profiles
            if (verifyResult.success) {
              const subscriptionEnd = verifyResult.subscriptionEnd
                ? new Date(verifyResult.subscriptionEnd)
                : new Date(Date.now() + plan.duration_months * 30 * 24 * 60 * 60 * 1000);

              await updateUserSubscription(userId, true, subscriptionEnd);

              setSuccess(`Payment successful! Your ${plan.name} is now active.`);
              setTimeout(() => {
                onPaymentSuccess(subscriptionEnd);
                onClose();
              }, 2000);
            }
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          }
          setLoading(false);
        },
        (errorMsg: string) => {
          setError(errorMsg);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="mr-2 text-yellow-500" size={28} />
            Choose Your Premium Plan
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <div
                key={key}
                onClick={() => setSelectedPlan(key as keyof typeof SUBSCRIPTION_PLANS)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPlan === key
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-blue-600 my-2">₹{plan.price}</p>
                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                <div className="flex items-center text-sm text-green-600">
                  <Check size={16} className="mr-1" />
                  {plan.duration_months === 1 && '1 month access'}
                  {plan.duration_months === 3 && '3 months access'}
                  {plan.duration_months === 12 && '12 months access'}
                </div>
              </div>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Processing Payment...
              </>
            ) : (
              <>
                <Zap size={18} className="mr-2" />
                Pay ₹{SUBSCRIPTION_PLANS[selectedPlan].price} Now
              </>
            )}
          </button>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Secure payment powered by Razorpay. Your data is encrypted and safe.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
