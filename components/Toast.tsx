import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onClose?: () => void;
}

const bgFor = (type: string | undefined) => {
  switch (type) {
    case 'success': return 'bg-green-50 border-green-200 text-green-800';
    case 'error': return 'bg-red-50 border-red-200 text-red-800';
    default: return 'bg-white border-gray-200 text-gray-900';
  }
};

const Toast: React.FC<ToastProps> = ({ message, type = 'info', visible, onClose }) => {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onClose && onClose(), 3500);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-6 right-6 max-w-xs w-full p-4 rounded-lg shadow-lg border ${bgFor(type)} z-50`}>
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
};

export default Toast;
