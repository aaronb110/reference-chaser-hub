'use client';

import { useEffect } from 'react';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
};

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000); // auto-close after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle =
    'fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white font-medium';
  const typeStyle =
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
      ? 'bg-red-600'
      : 'bg-blue-600';

  return (
    <div className={`${baseStyle} ${typeStyle}`}>
      {message}
    </div>
  );
}
